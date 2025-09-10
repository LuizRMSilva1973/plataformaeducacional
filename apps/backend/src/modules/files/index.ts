import { Router } from 'express'
import { prisma } from '../../lib/prisma.js'
import { requireMembership } from '../../middleware/auth.js'
import { z } from 'zod'
import fs from 'fs'
import fsp from 'fs/promises'
import path from 'path'

export const router = Router()

const uploadSchema = z.object({ filename: z.string().min(1), mimeType: z.string().min(1), data: z.string().min(1) })
router.post('/', requireMembership('TEACHER'), async (req, res) => {
  const parsed = uploadSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: parsed.error.flatten() })
  const { filename, mimeType, data } = parsed.data
  const schoolId = req.schoolId!
  const userId = req.user!.id

  const baseDir = process.env.STORAGE_DIR || path.resolve(process.cwd(), 'uploads')
  const schoolDir = path.join(baseDir, schoolId)
  await fsp.mkdir(schoolDir, { recursive: true })
  const id = (Math.random().toString(36).slice(2))
  const safeName = filename.replace(/[^a-zA-Z0-9_.-]+/g, '_')
  const filePath = path.join(schoolDir, `${id}_${safeName}`)
  try {
    // Handle data URL prefix
    const base64 = data.startsWith('data:') ? data.split(',')[1] : data
    await fsp.writeFile(filePath, Buffer.from(base64, 'base64'))
  } catch {
    return res.status(400).json({ error: 'Invalid base64 data' })
  }

  const stored = await prisma.storedFile.create({ data: { schoolId, ownerUserId: userId, path: filePath, mimeType } })
  return res.status(201).json({ id: stored.id, mimeType: stored.mimeType })
})

router.get('/:id', requireMembership(), async (req, res) => {
  const schoolId = req.schoolId!
  const { id } = req.params
  const file = await prisma.storedFile.findFirst({ where: { id, schoolId } })
  if (!file) return res.status(404).json({ error: 'Arquivo não encontrado' })
  res.setHeader('Content-Type', file.mimeType)
  const stream = fs.createReadStream(file.path)
  stream.on('error', () => res.status(500).end())
  stream.pipe(res)
})
