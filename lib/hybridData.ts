import { PrismaClient } from '@prisma/client'
import mongoose from 'mongoose'
import User from '@/models/User'
import Plan from '@/models/Plan'
import Payment from '@/models/Payment'
import Invoice from '@/models/Invoice'
import SMSLog from '@/models/SMSLog'

// Initialize Prisma client for SQLite
const prisma = new PrismaClient()

// Connection status tracking
let isOnline = true
let lastOnlineCheck = Date.now()
const CHECK_INTERVAL = 5000 // 5 seconds

// Check if we're online by trying MongoDB connection
export async function checkOnlineStatus(): Promise<boolean> {
  const now = Date.now()
  
  // Avoid checking too frequently
  if (now - lastOnlineCheck < CHECK_INTERVAL) {
    return isOnline
  }
  
  try {
    // Try to ping MongoDB
    const db = mongoose.connection.db
    if (db) {
      await db.admin().ping()
      isOnline = true
    } else {
      isOnline = false
    }
    lastOnlineCheck = now
    
    // If we just came online, trigger sync
    if (!isOnline) {
      console.log('📡 Connection restored - starting sync...')
      // triggerSync() // Will implement this next
    }
    
    return true
  } catch (error) {
    console.log('📴 Offline mode - using local database')
    isOnline = false
    lastOnlineCheck = now
    return false
  }
}

// Hybrid User Service
export class HybridUserService {
  
  // Get all users (online/offline)
  static async getUsers(filters: any = {}) {
    const online = await checkOnlineStatus()
    
    if (online) {
      try {
        // Use MongoDB when online
        const users = await User.find(filters).lean()
        
        // Cache users in SQLite for offline access
        await this.cacheUsersToSQLite(users)
        
        return {
          source: 'mongodb',
          data: users
        }
      } catch (error) {
        console.log('MongoDB failed, falling back to SQLite')
        // Fall back to SQLite
      }
    }
    
    // Use SQLite when offline
    const users = await prisma.user.findMany({
      where: this.buildSQLiteFilters(filters),
      include: {
        enrollments: true,
        payments: true,
      }
    })
    
    return {
      source: 'sqlite',
      data: users
    }
  }
  
  // Create user (online/offline)
  static async createUser(userData: any) {
    const online = await checkOnlineStatus()
    
    if (online) {
      try {
        // Create in MongoDB first
        const mongoUser = new User(userData)
        await mongoUser.save()
        
        // Cache in SQLite
        await prisma.user.create({
          data: {
            mongoId: mongoUser._id.toString(),
            name: userData.name,
            email: userData.email,
            phone: userData.phone || '',
            password: userData.password,
            role: userData.role || 'CUSTOMER',
            isActive: userData.isActive ?? true,
            address: userData.address,
            totalInvestment: userData.totalInvestment || 0,
            currentBalance: userData.currentBalance || 0,
          }
        })
        
        return {
          source: 'mongodb',
          data: mongoUser
        }
      } catch (error) {
        console.log('MongoDB failed, creating locally')
      }
    }
    
    // Create locally when offline
    const localUser = await prisma.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        phone: userData.phone || '',
        password: userData.password,
        role: userData.role || 'CUSTOMER',
        isActive: userData.isActive ?? true,
        address: userData.address,
        totalInvestment: userData.totalInvestment || 0,
        currentBalance: userData.currentBalance || 0,
      }
    })
    
    // Mark for sync when online
    await this.markForSync('users', localUser.id)
    
    return {
      source: 'sqlite',
      data: localUser
    }
  }
  
  // Cache MongoDB users to SQLite
  private static async cacheUsersToSQLite(users: any[]) {
    for (const user of users) {
      try {
        await prisma.user.upsert({
          where: { mongoId: user._id.toString() },
          update: {
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: user.role || 'CUSTOMER',
            isActive: user.isActive ?? true,
            address: user.address,
            totalInvestment: user.totalInvestment || 0,
            currentBalance: user.currentBalance || 0,
            lastSyncedAt: new Date(),
          },
          create: {
            mongoId: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            password: user.password || 'temp',
            role: user.role || 'CUSTOMER',
            isActive: user.isActive ?? true,
            address: user.address,
            totalInvestment: user.totalInvestment || 0,
            currentBalance: user.currentBalance || 0,
            lastSyncedAt: new Date(),
          }
        })
      } catch (error) {
        console.error('Error caching user:', user._id, error)
      }
    }
  }
  
  // Convert MongoDB filters to Prisma filters
  private static buildSQLiteFilters(mongoFilters: any) {
    const prismaFilters: any = {}
    
    if (mongoFilters.role) {
      prismaFilters.role = mongoFilters.role
    }
    
    if (mongoFilters.isActive !== undefined) {
      prismaFilters.isActive = mongoFilters.isActive
    }
    
    if (mongoFilters.name) {
      prismaFilters.name = { contains: mongoFilters.name }
    }
    
    return prismaFilters
  }
  
  // Mark record for sync when online
  private static async markForSync(tableName: string, recordId: string) {
    await prisma.syncStatus.upsert({
      where: { tableName },
      update: {
        pendingSync: true,
        updatedAt: new Date()
      },
      create: {
        tableName,
        pendingSync: true,
        syncDirection: 'TO_CLOUD'
      }
    })
  }
}

// Hybrid Plan Service
export class HybridPlanService {
  
  static async getPlans(filters: any = {}) {
    const online = await checkOnlineStatus()
    
    if (online) {
      try {
        const plans = await Plan.find(filters).lean()
        await this.cachePlansToSQLite(plans)
        return { source: 'mongodb', data: plans }
      } catch (error) {
        console.log('MongoDB failed, using SQLite plans')
      }
    }
    
    const plans = await prisma.plan.findMany({
      where: filters.isActive !== undefined ? { isActive: filters.isActive } : {},
      include: { enrollments: true }
    })
    
    return { source: 'sqlite', data: plans }
  }
  
  static async createPlan(planData: any) {
    const online = await checkOnlineStatus()
    
    if (online) {
      try {
        const mongoPlan = new Plan(planData)
        await mongoPlan.save()
        
        await prisma.plan.create({
          data: {
            mongoId: mongoPlan._id.toString(),
            name: planData.name,
            description: planData.description,
            totalAmount: planData.totalAmount,
            installmentAmount: planData.installmentAmount,
            duration: planData.duration,
            memberLimit: planData.memberLimit,
            isActive: planData.isActive ?? true,
            commissionRate: planData.commissionRate || 0.05,
            penaltyRate: planData.penaltyRate || 0.02,
          }
        })
        
        return { source: 'mongodb', data: mongoPlan }
      } catch (error) {
        console.log('MongoDB failed, creating plan locally')
      }
    }
    
    const localPlan = await prisma.plan.create({
      data: {
        name: planData.name,
        description: planData.description,
        totalAmount: planData.totalAmount,
        installmentAmount: planData.installmentAmount,
        duration: planData.duration,
        memberLimit: planData.memberLimit,
        isActive: planData.isActive ?? true,
        commissionRate: planData.commissionRate || 0.05,
        penaltyRate: planData.penaltyRate || 0.02,
      }
    })
    
    await this.markForSync('plans', localPlan.id)
    return { source: 'sqlite', data: localPlan }
  }
  
  private static async cachePlansToSQLite(plans: any[]) {
    for (const plan of plans) {
      try {
        await prisma.plan.upsert({
          where: { mongoId: plan._id.toString() },
          update: {
            name: plan.name,
            description: plan.description,
            totalAmount: plan.totalAmount,
            installmentAmount: plan.installmentAmount,
            duration: plan.duration,
            memberLimit: plan.memberLimit,
            isActive: plan.isActive ?? true,
            lastSyncedAt: new Date(),
          },
          create: {
            mongoId: plan._id.toString(),
            name: plan.name,
            description: plan.description,
            totalAmount: plan.totalAmount,
            installmentAmount: plan.installmentAmount,
            duration: plan.duration,
            memberLimit: plan.memberLimit,
            isActive: plan.isActive ?? true,
            lastSyncedAt: new Date(),
          }
        })
      } catch (error) {
        console.error('Error caching plan:', plan._id, error)
      }
    }
  }
  
  private static async markForSync(tableName: string, recordId: string) {
    await prisma.syncStatus.upsert({
      where: { tableName },
      update: { pendingSync: true, updatedAt: new Date() },
      create: { tableName, pendingSync: true, syncDirection: 'TO_CLOUD' }
    })
  }
}

// Hybrid Payment Service
export class HybridPaymentService {
  
  static async createPayment(paymentData: any) {
    const online = await checkOnlineStatus()
    
    if (online) {
      try {
        const mongoPayment = new Payment(paymentData)
        await mongoPayment.save()
        
        // Cache in SQLite
        await prisma.payment.create({
          data: {
            mongoId: mongoPayment._id.toString(),
            userId: paymentData.userId, // Will need to map to local user ID
            planId: paymentData.planId,   // Will need to map to local plan ID
            amount: paymentData.amount,
            paymentDate: new Date(paymentData.paymentDate || Date.now()),
            paymentMethod: paymentData.paymentMethod || 'CASH',
            status: 'COMPLETED',
            receiptNumber: paymentData.receiptNumber,
            dueNumber: paymentData.dueNumber,
            lateFee: paymentData.lateFee || 0,
            remarks: paymentData.remarks,
          }
        })
        
        return { source: 'mongodb', data: mongoPayment }
      } catch (error) {
        console.log('MongoDB failed, creating payment locally')
      }
    }
    
    // Create locally when offline
    const localPayment = await prisma.payment.create({
      data: {
        userId: paymentData.userId,
        planId: paymentData.planId,
        amount: paymentData.amount,
        paymentDate: new Date(paymentData.paymentDate || Date.now()),
        paymentMethod: paymentData.paymentMethod || 'CASH',
        status: 'COMPLETED',
        receiptNumber: paymentData.receiptNumber,
        dueNumber: paymentData.dueNumber,
        lateFee: paymentData.lateFee || 0,
        remarks: paymentData.remarks,
      }
    })
    
    await this.markForSync('payments', localPayment.id)
    return { source: 'sqlite', data: localPayment }
  }
  
  private static async markForSync(tableName: string, recordId: string) {
    await prisma.syncStatus.upsert({
      where: { tableName },
      update: { pendingSync: true, updatedAt: new Date() },
      create: { tableName, pendingSync: true, syncDirection: 'TO_CLOUD' }
    })
  }
}

// Export the main service
export default {
  checkOnlineStatus,
  users: HybridUserService,
  plans: HybridPlanService,
  payments: HybridPaymentService,
  prisma // Export for direct access if needed
}