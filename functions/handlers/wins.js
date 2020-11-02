/* eslint-disable promise/no-nesting */
const { db } = require('../utils/admin');

module.exports.getAllWins = (req, res) => {
  let wins = [];

  db.collection('wins')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
      data.forEach((doc) => {
        wins.push({
          id: doc.id,
          body: doc.data().body,
          username: doc.data().username,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(wins);
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ message: 'Server Error:' });
    });
};

module.exports.postOneWin = (req, res) => {
  const { body } = req.body;
  console.log(req.user.username);
  const newWin = {
    username: req.user.username,
    body,
    createdAt: new Date().toISOString(),
    likesCount: 0,
    commentsCount: 0,
  };
  db.collection('wins')
    .add(newWin)
    .then((doc) => {
      const resWin = newWin;
      resWin.winId = doc.id;
      return res.json(resWin);
    })
    .catch((err) => {
      console.log(err);
      return res.status(500).json({ error: 'Server Error', data: err.message });
    });
};

module.exports.getWin = (req, res) => {
  let winData = {};
  db.doc(`/wins/${req.params.winId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: 'Win not found' });
      }
      winData = doc.data();
      winData.winId = doc.id;
      return db
        .collection('comments')
        .orderBy('createdAt', 'desc')
        .where('winId', '==', req.params.winId)
        .get();
    })
    .then((data) => {
      winData.comments = [];
      data.forEach((doc) => {
        winData.comments.push(doc.data());
      });
      return res.json(winData);
    })
    .catch((err) => {
      return res.status(500).json({ error: 'Server Error', data: err.message });
    });
};

module.exports.commentOnWin = (req, res) => {
  if (req.body.body.trim() === '')
    return res.status(400).json({ error: { message: 'Must not be empty' } });
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    winId: req.params.winId,
    username: req.user.username,
  };

  return db
    .doc(`/wins/${req.params.winId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: { message: 'Win not found' } });
      }
      return doc.ref.update({ commentsCount: doc.data().commentsCount + 1 });
    })
    .then(() => {
      return db.collection('comments').add(newComment);
    })
    .then(() => {
      return res.json(newComment);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).jsno({ error: { message: 'server error', err } });
    });
};

module.exports.likeWin = (req, res) => {
  const winRef = db.doc(`/wins/${req.params.winId}`);
  const likeRef = db
    .collection('likes')
    .where('username', '==', req.user.username)
    .where('winId', '==', req.params.winId);
  let winData;

  winRef
    .get()
    .then((doc) => {
      if (doc.exists) {
        winData = doc.data();
        winData.winId = doc.id;
        return likeRef.get();
      } else {
        return res
          .status(404)
          .json({ error: { message: 'Win does not exist' } });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection('likes')
          .add({ username: req.user.username, winId: winData.winId })
          .then(() => {
            winData.likesCount += 1;
            return winRef.update({ likesCount: winData.likesCount });
          })
          .then(() => {
            return res.json(winData);
          });
      } else {
        return res
          .status(400)
          .json({ error: { message: 'Win already liked ' } });
      }
    })
    .catch((err) => {
      return res.status(500).json({ error: { message: err.code } });
    });
};

module.exports.unlikeWin = (req, res) => {
  const winRef = db.doc(`/wins/${req.params.winId}`);
  const likeRef = db
    .collection('likes')
    .where('username', '==', req.user.username)
    .where('winId', '==', req.params.winId);
  let winData;

  winRef
    .get()
    .then((doc) => {
      if (doc.exists) {
        winData = doc.data();
        winData.winId = doc.id;
        return likeRef.get();
      } else {
        return res
          .status(404)
          .json({ error: { message: 'Win does not exist' } });
      }
    })
    .then((data) => {
      if (!data.empty) {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            winData.likesCount -= 1;
            return winRef.update({ likesCount: winData.likesCount });
          })
          .then(() => {
            return res.json(winData);
          });
      } else {
        return res
          .status(400)
          .json({ error: { message: 'Win not liked so that you can unlike' } });
      }
    })
    .catch((err) => {
      return res.status(500).json({ error: { message: err.code } });
    });
};

module.exports.deleteWin = (req, res) => {
  const winRef = db.doc(`/wins/${req.params.winId}`);
  winRef
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res
          .status(404)
          .json({ error: { message: 'No document found to be deleted LOL' } });
      }
      if (doc.data().username !== req.user.username) {
        return res.status(403).json({ error: { message: 'Unauthorized' } });
      } else {
        return winRef.delete();
      }
    })
    .then(() => {
      return res.json({ message: 'win deleted susessfully' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: { message: err.code } });
    });
};
