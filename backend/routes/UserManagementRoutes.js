const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const EmployersProfile = require('../models/employersProfile');
const Profile = require('../models/Profile');
const bcrypt = require('bcryptjs'); // <-- ADD THIS IMPORT




router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    let user = await Admin.findById(id).lean();
    if (!user) {
      user = await EmployersProfile.findById(id).lean();
    }
    if (!user) {
      user = await Profile.findById(id).lean();
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user details:', error);
    res.status(500).json({ message: 'Server error' });
  }
});



// ... your existing router.get('/users', ...) route is here ...

// UPDATE User (for saveUserEdits and changeStatus)
// UPDATE THIS EXISTING ROUTE
// PATCH /api/admin/merged-users/users/:id - Update User
router.patch('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body; // e.g., { fullName, email, status, password, role, bio, phone, companyName, ... }

    let user;
    let userType = '';

    // Find the user
    user = await Admin.findById(id);
    if (user) {
      userType = 'admin';
    } else {
      user = await EmployersProfile.findById(id);
      if (user) {
        userType = 'employer';
      } else {
        user = await Profile.findById(id);
        if (user) {
          userType = 'jobseeker';
        } else {
          return res.status(404).json({ message: 'User not found' });
        }
      }
    }

    // --- Apply common updates ---
    if (updates.role) user.role = updates.role;
    if (updates.status) user.status = updates.status;
    
    // --- Apply type-specific updates ---
    if (userType === 'admin') {
      if (updates.fullName) user.name = updates.fullName;
      if (updates.email) user.email = updates.email;
      if (updates.password) {
        const saltRounds = 10;
        user.passwordHash = await bcrypt.hash(updates.password, saltRounds);
        console.log('Admin password securely updated.');
      }
    } 
    
    else if (userType === 'employer') {
      if (updates.fullName) user.ownerName = updates.fullName;
      if (updates.email) user.ownerEmail = updates.email;
      if (updates.password) {
        const saltRounds = 10;
        user.passwordHash = await bcrypt.hash(updates.password, saltRounds);
        console.log('Employer password securely updated.');
      }
      // NEW Employer fields
      if (updates.companyName) user.companyName = updates.companyName;
      if (updates.ownerPhone) user.ownerPhone = updates.ownerPhone;
      if (updates.companyCity) user.companyCity = updates.companyCity;
    } 
    
    else if (userType === 'jobseeker') {
      if (updates.fullName) {
        const parts = updates.fullName.split(' ');
        user.firstName = parts[0] || '';
        user.lastName = parts.slice(1).join(' ') || '';
      }
      if (updates.email) user.email = updates.email;
      if (updates.password) {
        const saltRounds = 10;
        user.passwordHash = await bcrypt.hash(updates.password, saltRounds);
        console.log('Jobseeker password securely updated.');
      }
      // NEW Jobseeker fields
      if (updates.phone) user.phone = updates.phone;
      if (updates.city) user.city = updates.city;
      if (updates.bio) user.bio = updates.bio;
    }
    
    await user.save();

    // Return the updated user in the *summary* format for the table
    // (This part is unchanged from our previous work)
    let formattedUser;
    if (userType === 'admin') {
      formattedUser = { _id: user._id, id: user._id, name: user.name, email: user.email, role: user.role || 'admin', status: user.status || 'active', joined: user.createdAt };
    } else if (userType === 'employer') {
      formattedUser = { _id: user._id, id: user._id, name: user.ownerName, email: user.ownerEmail, role: user.role || 'employer', status: user.status || (user.emailVerified ? 'active' : 'unverified'), joined: user.createdAt };
    } else { // jobseeker
      formattedUser = { _id: user._id, id: user._id, name: `${user.firstName} ${user.lastName}`.trim(), email: user.email, role: user.role || 'jobhunter', status: user.status || 'active', joined: user.createdAt };
    }

    res.json(formattedUser);

  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE User
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Try deleting from all three collections
    let result = await Admin.findByIdAndDelete(id);
    if (!result) result = await EmployersProfile.findByIdAndDelete(id);
    if (!result) result = await Profile.findByIdAndDelete(id);

    if (!result) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', async (req, res) => {
  try {
    const admins = await Admin.find({});
    const employers = await EmployersProfile.find({});
    const jobseekers = await Profile.find({});

  
    // ... inside router.get('/users', ...)
    const allUsers = [
      ...admins.map(user => ({
        _id: user._id,      
        id: user._id,       
        name: user.name,
        email: user.email,
        role: user.role || 'admin',
        status: user.status || 'active', // <-- CHANGED
        joined: user.createdAt,
      })),
      ...employers.map(user => ({
        _id: user._id,      
        id: user._id,       
        name: user.ownerName,
        email: user.ownerEmail,
        role: user.role || 'employer',
        status: user.status || 'active', // <-- CHANGED (fixes 'unverified')
        joined: user.createdAt,
      })),
      ...jobseekers.map(user => ({
        _id: user._id,      
        id: user._id,       
        name: `${user.firstName} ${user.lastName}`.trim(),
        email: user.email,
        role: user.role || 'jobhunter',
        status: user.status || 'active', // <-- CHANGED
        joined: user.createdAt,
      })),
    ];

    res.json(allUsers);
// ...
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});




module.exports = router;
