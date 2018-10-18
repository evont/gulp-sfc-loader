const fs = require('fs');
const path = require('path');

module.exports = class File {
  static mkdir(dir) {
    const dirArr = dir.split(/[\/\\]/);
    let path = '';
    for (let i = 0, len = dirArr.length; i < len; i += 1) {
      path += `${dirArr[i]}/`;
      try {
        fs.mkdirSync(path);
      } catch (err) {
        if (err.code === 'EEXIST')  continue;
      }
    }
  }
  static writeFile(filePath, data) {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, new Buffer(data), (err) => {
        if (!err) {
          resolve(); return;
        } else if (err.code === 'ENOENT') {
          File.mkdir(path.dirname(filePath));
          File.writeFile(filePath, data);
          resolve();
        }
      })
    })
  }
  static readFile(filePath, callback) {
    return fs.readFileSync(filePath, 'utf-8');
    // new Promise((resolve, reject) => {
    //   fs.readFileSync(filePath, 'utf-8', (err, data) => {
    //     if (data) {
    //       resolve(data);
    //     } else {
    //       resolve('');
    //     }
    //   })
    // });
  }
}