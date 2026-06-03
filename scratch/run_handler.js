const handler = require('../pages/api/notebook-init').default;

const req = {
  method: 'POST',
  body: {
    videoTitle: 'Test Video',
    subject: 'Computer Science',
    segments: [],
    content: 'test content',
    courseId: 'web_dev_id'
  }
};

const res = {
  status(code) {
    console.log('Status code:', code);
    return this;
  },
  json(data) {
    console.log('JSON data:', JSON.stringify(data, null, 2));
    return this;
  }
};

handler(req, res);
