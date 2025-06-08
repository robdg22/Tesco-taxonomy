import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory storage for local development
let taxonomyData: any = null

const TAXONOMY_BLOB_NAME = 'custom-taxonomy.json'

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1'

export async function GET() {
  try {
    if (isVercel) {
      // Use Vercel Blob in production
      try {
        // Dynamic import to avoid issues in local development
        const { list, head } = await import('@vercel/blob')
        
        // List blobs to find our taxonomy file
        const { blobs } = await list({ prefix: TAXONOMY_BLOB_NAME })
        
        if (blobs.length > 0) {
          // Fetch the blob content
          const response = await fetch(blobs[0].url)
          const data = await response.json()
          
          return NextResponse.json({ 
            data: data,
            lastModified: blobs[0].uploadedAt,
            source: 'vercel-blob'
          }, { status: 200 })
        } else {
          return NextResponse.json({ data: null, source: 'vercel-blob' }, { status: 200 })
        }
      } catch (error) {
        console.error('Vercel Blob error, falling back to memory:', error)
        // Fall back to in-memory storage
        return NextResponse.json({ 
          data: taxonomyData,
          lastModified: new Date().toISOString(),
          source: 'memory-fallback'
        }, { status: 200 })
      }
    } else {
      // Use in-memory storage for local development
      return NextResponse.json({ 
        data: taxonomyData,
        lastModified: new Date().toISOString(),
        source: 'memory-local'
      }, { status: 200 })
    }
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
    
    if (isVercel) {
      // Use Vercel Blob in production
      try {
        const { put } = await import('@vercel/blob')
        
        const blob = await put(TAXONOMY_BLOB_NAME, JSON.stringify(dataToSave, null, 2), {
          access: 'public',
          contentType: 'application/json'
        })
        
        return NextResponse.json({ 
          success: true,
          message: 'Taxonomy saved to Vercel Blob',
          savedAt: dataToSave.savedAt,
          blobUrl: blob.url,
          source: 'vercel-blob'
        }, { status: 200 })
      } catch (error) {
        console.error('Vercel Blob save error, falling back to memory:', error)
        // Fall back to in-memory storage
        taxonomyData = dataToSave
        return NextResponse.json({ 
          success: true,
          message: 'Taxonomy saved to memory (Blob fallback)',
          savedAt: dataToSave.savedAt,
          source: 'memory-fallback'
        }, { status: 200 })
      }
    } else {
      // Store in memory for local development
      taxonomyData = dataToSave
      
      return NextResponse.json({ 
        success: true,
        message: 'Taxonomy saved to memory (local)',
        savedAt: dataToSave.savedAt,
        source: 'memory-local'
      }, { status: 200 })
    }
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
    if (isVercel) {
      // Use Vercel Blob in production
      try {
        const { del, list } = await import('@vercel/blob')
        
        // List and delete the blob
        const { blobs } = await list({ prefix: TAXONOMY_BLOB_NAME })
        if (blobs.length > 0) {
          await del(blobs[0].url)
        }
        
        return NextResponse.json({ 
          success: true,
          message: 'Taxonomy deleted from Vercel Blob',
          source: 'vercel-blob'
        }, { status: 200 })
      } catch (error) {
        console.error('Vercel Blob delete error:', error)
        taxonomyData = null
        return NextResponse.json({ 
          success: true,
          message: 'Taxonomy deleted from memory (Blob fallback)',
          source: 'memory-fallback'
        }, { status: 200 })
      }
    } else {
      // Clear memory for local development
      taxonomyData = null
      
      return NextResponse.json({ 
        success: true,
        message: 'Taxonomy deleted from memory (local)',
        source: 'memory-local'
      }, { status: 200 })
    }
  } catch (error) {
    console.error('Error deleting taxonomy:', error)
    return NextResponse.json(
      { error: 'Failed to delete taxonomy' },
      { status: 500 }
    )
  }
}
