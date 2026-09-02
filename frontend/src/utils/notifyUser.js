// utils/notifyUser.js
import { sendNotification } from '../api/notifications';


export async function notifyUser(token, { userId, userType, title, message, type = 'system' }) {
  try {
    await sendNotification(token, { userId, userType, title, message, type });
  } catch (err) {
    console.error(`❌ Failed to send notification to ${userType}:${userId}`, err);
  }
}
