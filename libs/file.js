const fs = require('fs');
const path = require('path');

module.exports = class File {
  /* 避免读写文件出现无此目录的情况 */
  static safeDir(filePath, callback) {
    fs.access(path.dirname(filePath), fs.constants.F_OK, (err) => {
      if (err) {
        fs.mkdir(path.dirname(filePath), (err) => {
          callback();
        });
      } else {
        callback();
      }
    }); 
  }
  static writeFile(filePath, data) {
    File.safeDir(filePath, () => {
      fs.writeFile(filePath, new Buffer(data), (err) => {
        if (err) {
          return console.log(err);
        }
      })
    })
  }
  static readFile(filePath, callback) {
    File.safeDir(filePath, () => {
      fs.readFile(filePath, 'utf-8', (err, data) => {
        if (data) {
          callback(data);
        } else {
          callback('');
        }
      })
    })
  }
}