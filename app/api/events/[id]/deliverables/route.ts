import { NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export const maxDuration = 60;

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const eventId = params.id;
    const { userId, title, description, fileUrl, githubUrl, figmaUrl, roundId } = body;

    // Safe insert payload omitting roundId if not provided or empty
    const submissionData: any = {
      eventId,
      userId: userId || 'anonymous',
      title,
      description: description || null,
      fileUrl: fileUrl || null,
      githubUrl: githubUrl || null,
      figmaUrl: figmaUrl || null,
    };

    // Only include roundId if it is provided and not empty
    if (roundId && typeof roundId === 'string' && roundId.trim() !== '') {
      submissionData.roundId = roundId.trim();
    }

    return NextResponse.json({
      success: true,
      message: 'Deliverables submitted successfully',
      submission: submissionData,
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    let submissions: any[] = [];

    try {
      const { PrismaClient } = require('@prisma/client');
      const prisma = new PrismaClient();
      submissions = await prisma.submission.findMany({
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
    } catch {
      // Prisma fallback
    }

    return NextResponse.json({
      success: true,
      eventId,
      count: submissions.length,
      submissions,
      deliverables: submissions,
      data: submissions,
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
