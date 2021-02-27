require('dotenv').config()
const datauri = require('datauri');
const fetch = require('node-fetch');
const gify = require('gify');
const { app, BrowserWindow, ipcMain, shell } = require('electron')

const CLIENT_ID = process.env.GYAZO_CLIENT_ID

function createWindow () {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true
    }
  })

  win.loadFile('index.html')
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

/**
 * Upload image to gyazo
 * @param {String} imageData 
 */
const uploadGyazo = (imageData) => {
  console.log('uploadServer');

  const params = new URLSearchParams();
  params.append('client_id', CLIENT_ID);
  params.append('image_url', imageData);
  params.append('referer_url', 'https://127.0.0.1');
  params.append('title', (new Date()).toISOString());
  params.append('metadata_is_public', 'false');

  return fetch(
      'https://upload.gyazo.com/api/upload/easy_auth',
      {
        method: 'POST',
        body: params,
      }
    )
}

/**
 * Start upload
 */
ipcMain.handle('start-upload', (event, ...args) => {
  console.log('got start-upload');
  console.log(args);

  args.forEach(path => {
    console.log(`Uploading ${path}`);
    datauri(path, (err, content, meta) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log(`meta.mimetype=${meta.mimetype}`)
      if (meta.mimetype.indexOf('image') > -1) {
        uploadGyazo(content)
          .then(res => res.json())
          .then(json => {
            console.log(json);
            if (json.get_image_url) {
              console.log(`Open browser ${json.get_image_url}`)
              shell.openExternal(json.get_image_url);
            }
          })
          .catch(reason => console.error(reason))
      } else if (meta.mimetype.indexOf('video') > -1) {
        const opts = {
          width: 800,
          height: 800,
          rate: 5,
        }
        console.log('Convert video to gif');
        gify(path, `${path}.gif`, opts, (err) => {
          if (err) {
            console.error(err);
            return;
          }
          console.log('Convert successful');
          datauri(`${path}.gif`, (err, content, meta) => {
            if (err) {
              console.error(err);
              return;
            }

            uploadGyazo(content)
              .then(res => res.json())
              .then(json => {
                console.log(json);
                if (json.get_image_url) {
                  console.log(`Open browser ${json.get_image_url}`)
                  shell.openExternal(json.get_image_url);
                }
              })
              .catch(reason => console.error(reason))
          })
        });
      } else {
        console.error(`Not support mimetype=${meta.mimetype}`)
      }
    });
  });
});