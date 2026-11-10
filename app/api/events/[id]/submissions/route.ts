import { NextResponse } from 'next/server';

let prisma: any;
try {
  const { PrismaClient } = require('@prisma/client');
  if (process.env.NODE_ENV === 'production') {
    prisma = new PrismaClient();
  } else {
    if (!(global as any).prisma) {
      (global as any).prisma = new PrismaClient();
    }
    prisma = (global as any).prisma;
  }
} catch {
  // Prisma client fallback
}

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;

    if (prisma?.submission) {
      const submissions = await prisma.submission.findMany({
        where: { eventId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              studentId: true,
              department: true,
              avatar: true,
              phone: true,
            },
          },
          round: true,
          team: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const formatted = submissions.map((sub: any) => ({
        ...sub,
        fullName: sub.user?.name || sub.submitterName || 'Student',
        rollNumber: sub.user?.studentId || sub.studentId || '',
        department: sub.user?.department || sub.department || 'General',
        email: sub.user?.email || sub.email || '',
        teamName: sub.team?.name || sub.teamName || null,
        roundTitle: sub.round?.title || null,
        roundNumber: sub.round?.roundNumber || null,
      }));

      return NextResponse.json({
        success: true,
        count: formatted.length,
        totalSubmissions: formatted.length,
        submissions: formatted,
        data: formatted,
      });
    }

    return NextResponse.json({
      success: true,
      count: 0,
      totalSubmissions: 0,
      submissions: [],
      data: [],
    });
  } catch (error: any) {
    console.error('Events submissions route error:', error);
    return NextResponse.json({ success: false, error: error.message, submissions: [] }, { status: 500 });
  }
}
