import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { getUserFromToken } from "@/utils/auth"; // Import your utility function

const prisma = new PrismaClient();

export async function GET() {
    try {
        const user = await getUserFromToken();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Fetch user's profile info including their name
        const userDetails = await prisma.user.findUnique({
            where: { id: user.userId },
            select: { id: true, email: true, role: true, name: true},
        });

        if (!userDetails) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            user: {
                userId: userDetails.id,
                email: userDetails.email,
                role: userDetails.role,
                name: userDetails.name,
            },
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        return NextResponse.json({ error: "Failed to fetch user data" }, { status: 500 });
    }
}
