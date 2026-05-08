import { NextResponse } from 'next/server';
import db from '@/db';
import { getSession } from '@/lib/session';
import { promises as fs } from 'fs';
import path from 'path';

export async function POST(request) {
    try {
        const session = await getSession();
        if (!session || session.role !== 'ADMIN') {
            return NextResponse.json({ error: 'No Autorizado' }, { status: 403 });
        }

        const formData = await request.formData();
        const file = formData.get('file');
        const operationId = formData.get('operationId');
        const note = formData.get('note') || '';

        if (!file || !operationId) {
            return NextResponse.json({ error: 'Archivo y operationId son requeridos' }, { status: 400 });
        }

        // Validate file type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Ensure directory exists
        const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'trading');
        try {
            await fs.access(uploadDir);
        } catch {
            await fs.mkdir(uploadDir, { recursive: true });
        }

        // Generate safe unique filename
        const ext = path.extname(file.name) || '.img';
        const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}${ext}`;
        const filePath = path.join(uploadDir, filename);

        await fs.writeFile(filePath, buffer);

        // Save reference in DB
        const imageUrl = `/uploads/trading/${filename}`;

        const stmt = db.prepare(`
            INSERT INTO trading_captures (operationId, imageUrl, note)
            VALUES (?, ?, ?)
        `);
        const info = stmt.run(operationId, imageUrl, note);

        return NextResponse.json({ success: true, id: info.lastInsertRowid, imageUrl }, { status: 201 });
    } catch (error) {
        console.error("Upload Capture Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
