# Notifications System Implementation

## Database Setup

**IMPORTANT: Run the SQL file first!**

Execute `notifications_setup.sql` in your Supabase SQL Editor. This will:
- Create the `notifications` table
- Set up RLS policies
- Create triggers for auto-generating notifications on friend requests and new messages

## What Was Implemented

### 1. Notification Bell in Sidebar
- Bell icon positioned between nav items and user profile pill
- Red badge showing unread notification count
- Click to toggle dropdown panel

### 2. Notifications Dropdown Panel
- Positioned above the bell, anchored to left sidebar
- 320px width, max 480px height
- Shows last 20 notifications
- Auto-marks as read after 2 seconds of opening panel
- "Mark all read" button in header
- Closes when clicking outside

### 3. Notification Types

**Friend Requests:**
- Bell icon
- Shows sender name + "sent you a friend request"
- Accept/Decline buttons inline
- Actions mark notification as read and remove from list

**New Messages:**
- Message bubble icon
- Shows sender name + message preview (first 60 chars)
- Clickable - navigates to inbox with conversation pre-selected
- Marks as read on click

### 4. Real-time Updates
- Supabase Realtime subscription for new notifications
- Automatically prepends new notifications to list
- Updates badge count in real-time

### 5. Removed from InboxPage
- Friend requests section removed from left column
- All friend request handling now through notifications panel
- Inbox now only shows conversations list

## Files Modified

1. `src/components/Sidebar.jsx` - Added notification bell and panel
2. `src/components/Sidebar.module.css` - Added notification styles
3. `src/pages/InboxPage.jsx` - Removed friend requests section
4. `notifications_setup.sql` - Database schema (run this first!)

## Testing Checklist

- [ ] Run SQL setup in Supabase
- [ ] Send a friend request - notification should appear
- [ ] Accept/decline from notification panel
- [ ] Send a message - notification should appear
- [ ] Click message notification - should navigate to inbox
- [ ] Badge count updates correctly
- [ ] "Mark all read" clears badge
- [ ] Auto-mark as read after 2 seconds works
- [ ] Panel closes when clicking outside
- [ ] Real-time updates work (test with two accounts)

## Next Steps

After running the SQL setup, the notifications system will be fully functional!
