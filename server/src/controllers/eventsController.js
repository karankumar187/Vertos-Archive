const Event = require('../models/Event');
const User = require('../models/User');

exports.getAllEvents = async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ date: 1 }); // Ascending order (upcoming first)
    res.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    res.status(500).json({ success: false, message: 'Server error fetching events' });
  }
};

exports.createEvent = async (req, res) => {
  try {
    // Only admins can create events
    const user = await User.findById(req.user.id);
    if (user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized. Only admins can create events.' });
    }

    const { title, description, date, location, type } = req.body;

    if (!title || !description || !date || !location) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newEvent = new Event({
      title,
      description,
      date,
      location,
      type: type || 'Other'
    });

    await newEvent.save();

    res.status(201).json({ success: true, data: newEvent });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, message: 'Server error creating event' });
  }
};

exports.toggleInterest = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const index = event.interestedUsers.indexOf(userId);
    if (index === -1) {
      event.interestedUsers.push(userId); // Add interest
    } else {
      event.interestedUsers.splice(index, 1); // Remove interest
    }

    await event.save();

    res.json({ success: true, data: event });
  } catch (error) {
    console.error('Error toggling event interest:', error);
    res.status(500).json({ success: false, message: 'Server error toggling interest' });
  }
};
