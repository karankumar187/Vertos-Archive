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
      type: type || 'Other',
      registrationLink: req.body.registrationLink || null
    });

    await newEvent.save();

    try {
      const io = req.app.get('io');
      if (io) {
        io.emit('new_event', newEvent);
      }
    } catch (err) {
      console.error('[Socket] Failed to emit new_event:', err);
    }

    res.status(201).json({ success: true, data: newEvent });
  } catch (error) {
    console.error('Error creating event:', error);
    res.status(500).json({ success: false, message: 'Server error creating event' });
  }
};

exports.registerForEvent = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // One-time registration only - no toggle
    const alreadyRegistered = event.registeredUsers.map(u => u.toString()).includes(userId.toString());
    if (!alreadyRegistered) {
      event.registeredUsers.push(userId);
      await event.save();
    }

    res.json({
      success: true,
      data: event,
      alreadyRegistered,
      registeredCount: event.registeredUsers.length
    });
  } catch (error) {
    console.error('Error registering for event:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
