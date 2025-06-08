import { NextRequest, NextResponse } from 'next/server'
import { writeFile, readFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const TAXONOMY_FILE = path.join(DATA_DIR, 'custom-taxonomy.json')

// Ensure data directory exists
async function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

export async function GET() {
  try {
    await ensureDataDir()
    
    if (!existsSync(TAXONOMY_FILE)) {
      return NextResponse.json({ data: null }, { status: 200 })
    }
    
    const data = await readFile(TAXONOMY_FILE, 'utf-8')
    const taxonomy = JSON.parse(data)
    
    return NextResponse.json({ 
      data: taxonomy,
      lastModified: new Date().toISOString()
    }, { status: 200 })
  } catch (error) {
    console.error('Error loading taxonomy:', error)
    return NextResponse.json(
      { error: 'Failed to load taxonomy' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { taxonomy } = body
    
    if (!taxonomy) {
      return NextResponse.json(
        { error: 'Taxonomy data is required' },
        { status: 400 }
      )
    }
    
    await ensureDataDir()
    
    const dataToSave = {
      taxonomy,
      savedAt: new Date().toISOString(),
      version: '1.0'
    }
    
    await writeFile(TAXONOMY_FILE, JSON.stringify(dataToSave, null, 2))
    
    return NextResponse.json({ 
      success: true,
      message: 'Taxonomy saved successfully',
      savedAt: dataToSave.savedAt
    }, { status: 200 })
  } catch (error) {
    console.error('Error saving taxonomy:', error)
    return NextResponse.json(
      { error: 'Failed to save taxonomy' },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    if (existsSync(TAXONOMY_FILE)) {
      await writeFile(TAXONOMY_FILE, JSON.stringify({ taxonomy: null, deletedAt: new Date().toISOString() }))
    }
    
    return NextResponse.json({ 
      success: true,
      message: 'Taxonomy deleted successfully'
    }, { status: 200 })
  } catch (error) {
    console.error('Error deleting taxonomy:', error)
    return NextResponse.json(
      { error: 'Failed to delete taxonomy' },
      { status: 500 }
    )
  }
} 