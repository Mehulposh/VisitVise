
const { Notification } = require("../models");
const { pageOpts, pagination } = require("../utils/helpers");

// GET /notifications
exports.getNotifications = async (req, res) => {
  const p = pageOpts(req.query, 20, 100);

  const filter = {
    userId: req.user._id,
  };

  if (req.query.unread === "true") {
    filter.read = false;
  }

  const [items, total, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip(p.skip)
      .limit(p.limit)
      .lean(),

    Notification.countDocuments(filter),

    Notification.countDocuments({
      userId: req.user._id,
      read: false,
    }),
  ]);

  res.send({
    notifications: items,
    unread,
    pagination: pagination(p, total),
  });
};

// GET /notifications/unread-count
exports.getUnreadCount = async (req, res) => {
  const unread = await Notification.countDocuments({
    userId: req.user._id,
    read: false,
  });

  res.send({ unread });
};

// POST /notifications/read-all
exports.markAllAsRead = async (req, res) => {
  await Notification.updateMany(
    {
      userId: req.user._id,
      read: false,
    },
    {
      $set: { read: true },
    }
  );

  res.send({ ok: true });
};

// POST /notifications/:id/read
exports.markAsRead = async (req, res) => {
  await Notification.updateOne(
    {
      _id: req.params.id,
      userId: req.user._id,
    },
    {
      $set: { read: true },
    }
  );

  res.send({ ok: true });
};
