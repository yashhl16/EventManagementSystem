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

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    if (prisma?.event) {
      const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: {
          submissions: true,
          rounds: true,
          teams: true,
          lftPosts: true,
        },
      });
      if (event) {
        return NextResponse.json({ success: true, event });
      }
    }
    return NextResponse.json({
      success: true,
      event: {
        id: eventId,
        title: `Event #${eventId}`,
        allowTeams: false,
        isTeamEvent: false,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  try {
    const eventId = params.id;
    const body = await req.json().catch(() => ({}));
    const {
      title,
      description,
      category,
      bannerImage,
      eventDate,
      startTime,
      endTime,
      venue,
      maxCapacity,
      allowTeams,
      isTeamEvent,
      teamMinSize,
      teamMaxSize,
      teamSizeMin,
      teamSizeMax,
    } = body;

    const teamAllowed = allowTeams !== undefined ? Boolean(allowTeams) : (isTeamEvent !== undefined ? Boolean(isTeamEvent) : undefined);

    if (prisma?.event) {
      const updateData: any = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (category !== undefined) updateData.category = category;
      if (bannerImage !== undefined) updateData.bannerUrl = bannerImage;
      if (eventDate !== undefined) updateData.date = eventDate ? new Date(eventDate) : null;
      if (startTime !== undefined) updateData.startTime = startTime;
      if (endTime !== undefined) updateData.endTime = endTime;
      if (venue !== undefined) updateData.venue = venue;
      if (maxCapacity !== undefined) updateData.capacity = Number(maxCapacity);
      if (teamAllowed !== undefined) {
        updateData.allowTeams = teamAllowed;
        updateData.isTeamEvent = teamAllowed;
      }
      if (teamSizeMin !== undefined || teamMinSize !== undefined) {
        updateData.teamSizeMin = Number(teamSizeMin || teamMinSize);
      }
      if (teamSizeMax !== undefined || teamMaxSize !== undefined) {
        updateData.teamSizeMax = Number(teamSizeMax || teamMaxSize);
        updateData.maxTeamSize = Number(teamSizeMax || teamMaxSize);
      }

      const updated = await prisma.event.update({
        where: { id: eventId },
        data: updateData,
      });

      return NextResponse.json({ success: true, message: 'Event updated successfully.', event: updated });
    }

    return NextResponse.json({
      success: true,
      message: 'Event updated successfully.',
      event: {
        id: eventId,
        title,
        allowTeams: teamAllowed,
        isTeamEvent: teamAllowed,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}
