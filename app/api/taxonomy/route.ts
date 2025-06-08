import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory storage for demo purposes
// In production, you'd want to use a proper database
let taxonomyData: any = null

export async function GET() {
  try {
    return NextResponse.json({ 
      data: taxonomyData,
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
    
    const dataToSave = {
      taxonomy,
      savedAt: new Date().toISOString(),
      version: '1.0'
    }
    
    // Store in memory (will persist during the serverless function lifetime)
    taxonomyData = dataToSave
    
    return NextResponse.json({ 
      success: true,
      message: 'Taxonomy saved successfully (in memory)',
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
    taxonomyData = null
    
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