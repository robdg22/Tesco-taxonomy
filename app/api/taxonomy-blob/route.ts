import { NextRequest, NextResponse } from 'next/server'

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1'

export async function POST(request: NextRequest) {
  try {
    const { taxonomyId, taxonomy } = await request.json()
    
    if (!taxonomyId || !taxonomy) {
      return NextResponse.json({ error: 'Missing taxonomyId or taxonomy data' }, { status: 400 })
    }

    console.log(`Saving taxonomy ${taxonomyId} - Environment:`, isVercel ? 'Vercel' : 'Local')

    if (isVercel) {
      // Use Vercel Blob in production
      try {
        const { put } = await import('@vercel/blob')
        
        const filename = `taxonomy-${taxonomyId}.json`
        const jsonString = JSON.stringify(taxonomy, null, 2)
        
        const blob = await put(filename, jsonString, {
          access: 'public',
          contentType: 'application/json',
          allowOverwrite: true
        })

        console.log(`Successfully saved taxonomy ${taxonomyId} to blob: ${blob.url}`)
        
        return NextResponse.json({ 
          success: true, 
          url: blob.url,
          taxonomyId,
          source: 'vercel-blob'
        })
      } catch (error) {
        console.error('Vercel Blob save error:', error)
        return NextResponse.json({ 
          error: 'Failed to save taxonomy to blob',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    } else {
      // Local development - just return success (no actual storage)
      console.log(`Local development: simulating save of taxonomy ${taxonomyId}`)
      return NextResponse.json({ 
        success: true, 
        taxonomyId,
        source: 'local-simulation'
      })
    }
  } catch (error) {
    console.error('Error saving taxonomy to blob:', error)
    return NextResponse.json({ error: 'Failed to save taxonomy' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const taxonomyId = searchParams.get('taxonomyId')
    
    if (!taxonomyId) {
      return NextResponse.json({ error: 'Missing taxonomyId parameter' }, { status: 400 })
    }

    console.log(`Loading taxonomy ${taxonomyId} - Environment:`, isVercel ? 'Vercel' : 'Local')

    if (isVercel) {
      // Use Vercel Blob in production
      try {
        const { list } = await import('@vercel/blob')
        
        const filename = `taxonomy-${taxonomyId}.json`
        
        // List blobs to find our taxonomy file
        const { blobs } = await list({ prefix: filename })
        
        if (blobs.length === 0) {
          return NextResponse.json({ error: 'Taxonomy not found' }, { status: 404 })
        }

        // Fetch the blob content
        const response = await fetch(blobs[0].url)
        
        if (!response.ok) {
          return NextResponse.json({ error: 'Failed to fetch taxonomy' }, { status: 404 })
        }

        const text = await response.text()
        const taxonomy = JSON.parse(text)
        
        return NextResponse.json({ 
          success: true, 
          taxonomy,
          source: 'vercel-blob'
        })
      } catch (error) {
        console.error('Vercel Blob load error:', error)
        return NextResponse.json({ 
          error: 'Failed to load taxonomy from blob',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    } else {
      // Local development - return not found
      console.log(`Local development: simulating load of taxonomy ${taxonomyId}`)
      return NextResponse.json({ error: 'Taxonomy not found (local)' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error loading taxonomy from blob:', error)
    return NextResponse.json({ error: 'Failed to load taxonomy' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { taxonomyId } = await request.json()
    
    if (!taxonomyId) {
      return NextResponse.json({ error: 'Missing taxonomyId' }, { status: 400 })
    }

    console.log(`Deleting taxonomy ${taxonomyId} - Environment:`, isVercel ? 'Vercel' : 'Local')

    if (isVercel) {
      // Use Vercel Blob in production
      try {
        const { del, list } = await import('@vercel/blob')
        
        const filename = `taxonomy-${taxonomyId}.json`
        
        // List and delete the blob
        const { blobs } = await list({ prefix: filename })
        
        if (blobs.length > 0) {
          await del(blobs[0].url)
          console.log(`Successfully deleted taxonomy ${taxonomyId} from blob storage`)
        } else {
          console.log(`Taxonomy ${taxonomyId} not found in blob storage (already deleted)`)
        }
        
        return NextResponse.json({ 
          success: true, 
          taxonomyId,
          source: 'vercel-blob'
        })
      } catch (error) {
        console.error('Vercel Blob delete error:', error)
        return NextResponse.json({ 
          error: 'Failed to delete taxonomy from blob',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    } else {
      // Local development - just return success
      console.log(`Local development: simulating delete of taxonomy ${taxonomyId}`)
      return NextResponse.json({ 
        success: true, 
        taxonomyId,
        source: 'local-simulation'
      })
    }
  } catch (error) {
    console.error('Error deleting taxonomy from blob:', error)
    return NextResponse.json({ error: 'Failed to delete taxonomy' }, { status: 500 })
  }
}
