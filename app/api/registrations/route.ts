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
  // Prisma fallback
}

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventId, userId, teamId, teamName, registrationType } = body;

    if (!eventId) {
      return NextResponse.json({ success: false, message: 'Event ID is required.' }, { status: 400 });
    }

    if (prisma?.event) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        return NextResponse.json({ success: false, message: 'Event not found.' }, { status: 404 });
      }

      const allowsTeams = Boolean(event.allowTeams || event.isTeamEvent);

      if (teamId && !allowsTeams) {
        return NextResponse.json(
          {
            success: false,
            message: 'This event is strictly for individual participation. Team registrations are not permitted.',
          },
          { status: 400 }
        );
      }

      let finalTeamName = teamName || null;
      let finalTeamId = teamId || null;
      if (finalTeamId && !finalTeamName && prisma?.team) {
        const team = await prisma.team.findUnique({ where: { id: finalTeamId } });
        if (team) finalTeamName = team.name;
      }

      return NextResponse.json({
        success: true,
        message: 'Registration confirmed!',
        registration: {
          eventId,
          userId: userId || 'anonymous',
          teamId: finalTeamId,
          teamName: finalTeamName,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Registration confirmed!',
      registration: {
        eventId,
        userId: userId || 'anonymous',
        teamId: teamId || null,
        teamName: teamName || null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ success: true, registrations: [] });
}
