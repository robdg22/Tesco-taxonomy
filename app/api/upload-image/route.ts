import { NextRequest, NextResponse } from 'next/server'

// Check if we're in a Vercel environment
const isVercel = process.env.VERCEL === '1'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ 
        error: 'Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.' 
      }, { status: 400 })
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      return NextResponse.json({ 
        error: 'File too large. Maximum size is 5MB.' 
      }, { status: 400 })
    }

    console.log(`Uploading image: ${file.name} (${file.size} bytes) - Environment:`, isVercel ? 'Vercel' : 'Local')

    if (isVercel) {
      // Use Vercel Blob in production
      try {
        const { put } = await import('@vercel/blob')
        
        // Generate unique filename with timestamp
        const timestamp = Date.now()
        const extension = file.name.split('.').pop() || 'jpg'
        const filename = `category-images/${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
        
        const blob = await put(filename, file, {
          access: 'public',
          contentType: file.type,
          allowOverwrite: false
        })

        console.log(`Successfully uploaded image to blob: ${blob.url}`)
        
        return NextResponse.json({ 
          success: true, 
          url: blob.url,
          filename: filename,
          size: file.size,
          type: file.type,
          source: 'vercel-blob'
        })
      } catch (error) {
        console.error('Vercel Blob upload error:', error)
        return NextResponse.json({ 
          error: 'Failed to upload image to blob storage',
          details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 })
      }
    } else {
      // Local development - return a placeholder URL
      console.log(`Local development: simulating upload of ${file.name}`)
      const placeholderUrl = `https://via.placeholder.com/200x200/4F46E5/FFFFFF?text=${encodeURIComponent(file.name.split('.')[0])}`
      
      return NextResponse.json({ 
        success: true, 
        url: placeholderUrl,
        filename: file.name,
        size: file.size,
        type: file.type,
        source: 'local-placeholder'
      })
    }
  } catch (error) {
    console.error('Error uploading image:', error)
    return NextResponse.json({ 
      error: 'Failed to upload image',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
