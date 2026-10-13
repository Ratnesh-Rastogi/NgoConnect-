import * as notificationService from '../services/notificationService.js';

// List latest 50 notifications for the current user
export const list = async (req, res, next) => {
  try {
    const notifications = await notificationService.listUserNotifications(req.user.id, req.query);
    res.status(200).json({
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// Get unread notification count
export const unreadCount = async (req, res, next) => {
  try {
    const data = await notificationService.getUnreadCount(req.user.id);
    res.status(200).json({
      data
    });
  } catch (error) {
    next(error);
  }
};

// Mark single notification as read
export const markOneRead = async (req, res, next) => {
  try {
    const updated = await notificationService.markAsRead(req.user.id, req.params.id);
    res.status(200).json({
      data: updated
    });
  } catch (error) {
    next(error);
  }
};

// Mark all unread notifications as read
export const markAllRead = async (req, res, next) => {
  try {
    const result = await notificationService.markAllAsRead(req.user.id);
    res.status(200).json({
      data: result
    });
  } catch (error) {
    next(error);
  }
};
