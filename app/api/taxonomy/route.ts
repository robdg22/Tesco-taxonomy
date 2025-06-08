import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory storage for local development
let taxonomyData: any = null

const TAXONOMY_BLOB_NAME = 'custom-taxonomy.json'

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1'

export async function GET() {
  try {
    console.log('GET /api/taxonomy - Environment:', isVercel ? 'Vercel' : 'Local')
    
    if (isVercel) {
      // Use Vercel Blob in production
      try {
        console.log('Attempting to load from Vercel Blob...')
        // Dynamic import to avoid issues in local development
        const { list } = await import('@vercel/blob')
        
        // List blobs to find our taxonomy file
        console.log('Listing blobs with prefix:', TAXONOMY_BLOB_NAME)
        const { blobs } = await list({ prefix: TAXONOMY_BLOB_NAME })
        console.log('Found blobs:', blobs.length)
        
        if (blobs.length > 0) {
          console.log('Fetching blob from URL:', blobs[0].url)
          // Fetch the blob content
          const response = await fetch(blobs[0].url)
          
          if (!response.ok) {
            throw new Error(`Failed to fetch blob: ${response.status} ${response.statusText}`)
          }
          
          const text = await response.text()
          console.log('Blob content length:', text.length)
          
          let data
          try {
            data = JSON.parse(text)
            console.log('Successfully parsed JSON from blob')
          } catch (parseError) {
            console.error('JSON parse error:', parseError)
            console.error('Raw content (first 500 chars):', text.substring(0, 500))
            throw new Error('Invalid JSON in blob')
          }
          
          return NextResponse.json({ 
            data: data,
            lastModified: blobs[0].uploadedAt,
            source: 'vercel-blob'
          }, { status: 200 })
        } else {
          console.log('No blobs found, returning null')
          return NextResponse.json({ data: null, source: 'vercel-blob' }, { status: 200 })
        }
      } catch (error) {
        console.error('Vercel Blob error:', error)
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })
        // Fall back to in-memory storage
        return NextResponse.json({ 
          data: taxonomyData,
          lastModified: new Date().toISOString(),
          source: 'memory-fallback',
          error: error instanceof Error ? error.message : 'Unknown blob error'
        }, { status: 200 })
      }
    } else {
      // Use in-memory storage for local development
      console.log('Using local memory storage')
      return NextResponse.json({ 
        data: taxonomyData,
        lastModified: new Date().toISOString(),
        source: 'memory-local'
      }, { status: 200 })
    }
  } catch (error) {
    console.error('Error loading taxonomy:', error)
    return NextResponse.json(
      { 
        error: 'Failed to load taxonomy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('POST /api/taxonomy - Environment:', isVercel ? 'Vercel' : 'Local')
    
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
    
    console.log('Data to save:', {
      taxonomyLength: Array.isArray(taxonomy) ? taxonomy.length : 'not array',
      savedAt: dataToSave.savedAt
    })
    
    if (isVercel) {
      // Use Vercel Blob in production
      try {
        console.log('Attempting to save to Vercel Blob...')
        const { put } = await import('@vercel/blob')
        
        const jsonString = JSON.stringify(dataToSave, null, 2)
        console.log('JSON string length:', jsonString.length)
        
        const blob = await put(TAXONOMY_BLOB_NAME, jsonString, {
          access: 'public',
          contentType: 'application/json',
          allowOverwrite: true
        })
        
        console.log('Successfully saved to blob:', blob.url)
        
        return NextResponse.json({ 
          success: true,
          message: 'Taxonomy saved to Vercel Blob',
          savedAt: dataToSave.savedAt,
          blobUrl: blob.url,
          source: 'vercel-blob'
        }, { status: 200 })
      } catch (error) {
        console.error('Vercel Blob save error:', error)
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined
        })
        // Fall back to in-memory storage
        taxonomyData = dataToSave
        return NextResponse.json({ 
          success: true,
          message: 'Taxonomy saved to memory (Blob fallback)',
          savedAt: dataToSave.savedAt,
          source: 'memory-fallback',
          error: error instanceof Error ? error.message : 'Unknown blob error'
        }, { status: 200 })
      }
    } else {
      // Store in memory for local development
      console.log('Saving to local memory')
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
      { 
        error: 'Failed to save taxonomy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function DELETE() {
  try {
    console.log('DELETE /api/taxonomy - Environment:', isVercel ? 'Vercel' : 'Local')
    
    if (isVercel) {
      // Use Vercel Blob in production
      try {
        console.log('Attempting to delete from Vercel Blob...')
        const { del, list } = await import('@vercel/blob')
        
        // List and delete the blob
        const { blobs } = await list({ prefix: TAXONOMY_BLOB_NAME })
        console.log('Found blobs to delete:', blobs.length)
        
        if (blobs.length > 0) {
          await del(blobs[0].url)
          console.log('Successfully deleted blob')
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
          source: 'memory-fallback',
          error: error instanceof Error ? error.message : 'Unknown blob error'
        }, { status: 200 })
      }
    } else {
      // Clear memory for local development
      console.log('Clearing local memory')
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
      { 
        error: 'Failed to delete taxonomy',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
