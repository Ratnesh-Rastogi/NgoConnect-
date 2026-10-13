import { prisma } from '../config/prisma.js';
import { AppError } from '../errors/AppError.js';

// Helper to create notification inside an interactive transaction
export const createNotificationTx = async (tx, { userId, type, title, message }) => {
  return tx.notification.create({
    data: {
      userId,
      type,
      title,
      message
    }
  });
};

// Standalone notification creator (when not part of an existing transaction)
export const createNotification = async ({ userId, type, title, message }) => {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message
    }
  });
};

// Retrieve latest 50 notifications for the authenticated user, with optional ?unread=true
export const listUserNotifications = async (userId, { unread } = {}) => {
  const where = { userId };
  if (unread === 'true' || unread === true) {
    where.readAt = null;
  }

  return prisma.notification.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50
  });
};

// Get unread notification count
export const getUnreadCount = async (userId) => {
  const unreadCount = await prisma.notification.count({
    where: {
      userId,
      readAt: null
    }
  });
  return { unreadCount };
};

// Mark single notification as read (strictly owner only)
export const markAsRead = async (userId, notificationId) => {
  const notification = await prisma.notification.findUnique({
    where: { id: notificationId }
  });

  if (!notification) {
    throw new AppError('Notification not found', 404);
  }

  if (notification.userId !== userId) {
    throw new AppError('Forbidden: Access denied to notification', 403);
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() }
  });
};

// Mark all unread notifications as read for the user
export const markAllAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null
    },
    data: {
      readAt: new Date()
    }
  });

  return { count: result.count, message: 'All notifications marked as read' };
};
