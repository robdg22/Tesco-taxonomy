import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1'

export async function POST(request: NextRequest) {
  try {
    console.log('Uploading Tesco logo - Environment:', isVercel ? 'Vercel' : 'Local')

    if (isVercel) {
      // Use Vercel Blob in production
      try {
        const { put } = await import('@vercel/blob')
        
        // Read the logo file from the public directory
        const logoPath = join(process.cwd(), 'public', 'tesco-logo.svg')
        const logoContent = readFileSync(logoPath, 'utf-8')
        
        const blob = await put('tesco-logo.svg', logoContent, {
          access: 'public',
          contentType: 'image/svg+xml',
          allowOverwrite: true
        })

        console.log(`Successfully uploaded Tesco logo to blob: ${blob.url}`)
        
        return NextResponse.json({ 
          success: true, 
          url: blob.url,
          filename: 'tesco-logo.svg',
          source: 'vercel-blob'
        })
      } catch (error) {
        console.error('Vercel Blob upload error:', error)
        return NextResponse.json({ 
          error: 'Failed to upload logo to blob',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    } else {
      // Local development - just return the local path
      console.log('Local development: using local logo file')
      return NextResponse.json({ 
        success: true, 
        url: '/tesco-logo.svg',
        filename: 'tesco-logo.svg',
        source: 'local-file'
      })
    }
  } catch (error) {
    console.error('Error uploading logo:', error)
    return NextResponse.json({ error: 'Failed to upload logo' }, { status: 500 })
  }
}

export async function GET() {
  try {
    console.log('Getting Tesco logo URL - Environment:', isVercel ? 'Vercel' : 'Local')

    if (isVercel) {
      // Use Vercel Blob in production
      try {
        const { list } = await import('@vercel/blob')
        
        // List blobs to find our logo file
        const { blobs } = await list({ prefix: 'tesco-logo.svg' })
        
        if (blobs.length === 0) {
          return NextResponse.json({ error: 'Logo not found' }, { status: 404 })
        }

        return NextResponse.json({ 
          success: true, 
          url: blobs[0].url,
          filename: 'tesco-logo.svg',
          source: 'vercel-blob'
        })
      } catch (error) {
        console.error('Vercel Blob get error:', error)
        return NextResponse.json({ 
          error: 'Failed to get logo from blob',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    } else {
      // Local development - return local path
      return NextResponse.json({ 
        success: true, 
        url: '/tesco-logo.svg',
        filename: 'tesco-logo.svg',
        source: 'local-file'
      })
    }
  } catch (error) {
    console.error('Error getting logo:', error)
    return NextResponse.json({ error: 'Failed to get logo' }, { status: 500 })
  }
} 