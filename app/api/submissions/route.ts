import { NextResponse } from 'next/server';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { eventId, userId, title, description, fileUrl, githubUrl, figmaUrl, roundId } = body;

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
      message: 'Submission created successfully',
      submission: submissionData,
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    return NextResponse.json({
      success: true,
      submissions: [],
    });
  } catch (error: any) {
    console.error('Submission error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
