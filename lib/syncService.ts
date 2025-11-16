import { PrismaClient } from '@prisma/client'
import mongoose from 'mongoose'
import User from '@/models/User'
import Plan from '@/models/Plan'
import Payment from '@/models/Payment'
import { checkOnlineStatus } from '@/lib/hybridData'

const prisma = new PrismaClient()

export class SyncService {
  
  // Main sync function - run periodically when online
  static async performSync() {
    const online = await checkOnlineStatus()
    
    if (!online) {
      console.log('📴 Offline - skipping sync')
      return { success: false, message: 'Offline' }
    }
    
    console.log('🔄 Starting data synchronization...')
    
    try {
      // Sync users to cloud
      await this.syncUsersToCloud()
      
      // Sync plans to cloud  
      await this.syncPlansToCloud()
      
      // Sync payments to cloud
      await this.syncPaymentsToCloud()
      
      // Pull latest data from cloud
      await this.pullFromCloud()
      
      console.log('✅ Sync completed successfully')
      return { success: true, message: 'Sync completed' }
      
    } catch (error: any) {
      console.error('❌ Sync failed:', error)
      return { success: false, message: error.message }
    }
  }
  
  // Sync local users to MongoDB
  private static async syncUsersToCloud() {
    const localUsers = await prisma.user.findMany({
      where: {
        mongoId: null, // Only sync users created offline
      }
    })
    
    console.log(`📤 Syncing ${localUsers.length} users to cloud...`)
    
    for (const localUser of localUsers) {
      try {
        // Create in MongoDB
        const mongoUser = new User({
          name: localUser.name,
          email: localUser.email,
          phone: localUser.phone,
          password: localUser.password,
          role: localUser.role.toLowerCase(),
          isActive: localUser.isActive,
          address: localUser.address,
          totalInvestment: localUser.totalInvestment,
          currentBalance: localUser.currentBalance,
        })
        
        await mongoUser.save()
        
        // Update local record with MongoDB ID
        await prisma.user.update({
          where: { id: localUser.id },
          data: {
            mongoId: mongoUser._id.toString(),
            lastSyncedAt: new Date()
          }
        })
        
        console.log(`✅ Synced user: ${localUser.name}`)
        
      } catch (error) {
        console.error(`❌ Failed to sync user ${localUser.name}:`, error)
      }
    }
  }
  
  // Sync local plans to MongoDB
  private static async syncPlansToCloud() {
    const localPlans = await prisma.plan.findMany({
      where: {
        mongoId: null,
      }
    })
    
    console.log(`📤 Syncing ${localPlans.length} plans to cloud...`)
    
    for (const localPlan of localPlans) {
      try {
        const mongoPlan = new Plan({
          name: localPlan.name,
          description: localPlan.description,
          totalAmount: localPlan.totalAmount,
          installmentAmount: localPlan.installmentAmount,
          duration: localPlan.duration,
          memberLimit: localPlan.memberLimit,
          isActive: localPlan.isActive,
        })
        
        await mongoPlan.save()
        
        await prisma.plan.update({
          where: { id: localPlan.id },
          data: {
            mongoId: mongoPlan._id.toString(),
            lastSyncedAt: new Date()
          }
        })
        
        console.log(`✅ Synced plan: ${localPlan.name}`)
        
      } catch (error) {
        console.error(`❌ Failed to sync plan ${localPlan.name}:`, error)
      }
    }
  }
  
  // Sync local payments to MongoDB
  private static async syncPaymentsToCloud() {
    const localPayments = await prisma.payment.findMany({
      where: {
        mongoId: null,
      },
      include: {
        user: true,
        plan: true,
      }
    })
    
    console.log(`📤 Syncing ${localPayments.length} payments to cloud...`)
    
    for (const localPayment of localPayments) {
      try {
        // Need to get MongoDB IDs for user and plan
        const userMongoId = localPayment.user?.mongoId
        const planMongoId = localPayment.plan?.mongoId
        
        if (!userMongoId || !planMongoId) {
          console.log(`⚠️ Skipping payment - missing user or plan MongoDB ID`)
          continue
        }
        
        const mongoPayment = new Payment({
          userId: userMongoId,
          planId: planMongoId,
          amount: localPayment.amount,
          paymentDate: localPayment.paymentDate,
          paymentMethod: localPayment.paymentMethod.toLowerCase(),
          receiptNumber: localPayment.receiptNumber,
          dueNumber: localPayment.dueNumber,
          lateFee: localPayment.lateFee,
          remarks: localPayment.remarks,
        })
        
        await mongoPayment.save()
        
        await prisma.payment.update({
          where: { id: localPayment.id },
          data: {
            mongoId: mongoPayment._id.toString(),
            lastSyncedAt: new Date()
          }
        })
        
        console.log(`✅ Synced payment: ${localPayment.receiptNumber}`)
        
      } catch (error) {
        console.error(`❌ Failed to sync payment ${localPayment.receiptNumber}:`, error)
      }
    }
  }
  
  // Pull latest data from MongoDB to local cache
  private static async pullFromCloud() {
    console.log('📥 Pulling latest data from cloud...')
    
    try {
      // Pull users
      const cloudUsers = await User.find().lean()
      for (const user of cloudUsers) {
        await prisma.user.upsert({
          where: { mongoId: user._id.toString() },
          update: {
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            role: user.role?.toUpperCase() || 'CUSTOMER',
            isActive: user.isActive ?? true,
            lastSyncedAt: new Date(),
          },
          create: {
            mongoId: user._id.toString(),
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            password: user.password || 'temp',
            role: user.role?.toUpperCase() || 'CUSTOMER',
            isActive: user.isActive ?? true,
            lastSyncedAt: new Date(),
          }
        })
      }
      
      // Pull plans
      const cloudPlans = await Plan.find().lean()
      for (const plan of cloudPlans) {
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
            description: plan.description || '',
            totalAmount: plan.totalAmount,
            installmentAmount: plan.installmentAmount,
            duration: plan.duration,
            memberLimit: plan.memberLimit,
            isActive: plan.isActive ?? true,
            lastSyncedAt: new Date(),
          }
        })
      }
      
      console.log('✅ Cloud data pulled successfully')
      
    } catch (error) {
      console.error('❌ Failed to pull from cloud:', error)
    }
  }
  
  // Mark all sync status as completed
  private static async updateSyncStatus() {
    await prisma.syncStatus.updateMany({
      where: { pendingSync: true },
      data: {
        pendingSync: false,
        lastSyncedAt: new Date()
      }
    })
  }
}

// Auto-sync every 30 seconds when online
let syncInterval: NodeJS.Timeout | null = null

export function startAutoSync() {
  if (syncInterval) return // Already running
  
  console.log('🔄 Starting auto-sync service...')
  
  syncInterval = setInterval(async () => {
    try {
      await SyncService.performSync()
    } catch (error) {
      console.error('Auto-sync error:', error)
    }
  }, 30000) // 30 seconds
}

export function stopAutoSync() {
  if (syncInterval) {
    clearInterval(syncInterval)
    syncInterval = null
    console.log('⏹️ Auto-sync stopped')
  }
}

export default SyncService