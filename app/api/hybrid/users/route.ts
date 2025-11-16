import { NextRequest, NextResponse } from 'next/server'
import HybridData from '@/lib/hybridData'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const role = searchParams.get('role') || 'all'
    
    // Build filters
    const filters: any = {}
    if (role !== 'all') {
      filters.role = role.toUpperCase()
    }
    
    console.log('🔄 Fetching users with hybrid data service...')
    
    // Use hybrid service - automatically handles online/offline
    const result = await HybridData.users.getUsers(filters)
    
    // Process data for pagination (simplified for offline)
    const users = result.data
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedUsers = users.slice(startIndex, endIndex)
    
    // Calculate stats
    const stats = {
      totalUsers: users.length,
      activeUsers: users.filter((u: any) => u.isActive).length,
      staffUsers: users.filter((u: any) => u.role === 'STAFF' || u.role === 'ADMIN').length,
      customerUsers: users.filter((u: any) => u.role === 'CUSTOMER').length
    }
    
    const pagination = {
      currentPage: page,
      totalPages: Math.ceil(users.length / limit),
      totalItems: users.length,
      hasNext: endIndex < users.length,
      hasPrev: page > 1
    }
    
    console.log(`✅ Users loaded from ${result.source} (${users.length} total)`)
    
    return NextResponse.json({
      customers: paginatedUsers.map((user: any) => ({
        _id: user.mongoId || user.id,
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        isActive: user.isActive,
        address: user.address,
        totalInvestment: user.totalInvestment || 0,
        currentBalance: user.currentBalance || 0,
        enrollments: user.enrollments || [],
        payments: user.payments || [],
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        source: result.source // Indicate data source
      })),
      stats,
      pagination,
      dataSource: result.source,
      online: await HybridData.checkOnlineStatus()
    })
    
  } catch (error: any) {
    console.error('❌ Error in hybrid users API:', error)
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch users',
        details: error.message,
        offline: true 
      },
      { status: 500 }
    )
  }
}