const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    popup: './popup/popup.js',
    content: './content/content.js',
    background: './background/background.js'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env']
          }
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|svg|jpg|jpeg|gif|ico)$/i,
        type: 'asset/resource',
        generator: {
          filename: 'assets/icons/[name][ext]'
        }
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: 'manifest.json',
          to: 'manifest.json'
        },
        {
          from: 'popup/popup.html',
          to: 'popup.html'
        },
        {
          from: 'popup/popup.css',
          to: 'popup.css'
        },
        {
          from: 'popup/css/popup.css',
          to: 'popup/css/popup.css'
        },
        {
          from: 'content/content.css',
          to: 'content.css'
        },
        {
          from: 'options/options.html',
          to: 'options.html'
        },
        {
          from: 'options/options.css',
          to: 'options.css'
        },
        {
          from: 'assets/icons',
          to: 'assets/icons'
        },
        {
          from: 'assets/audio',
          to: 'assets/audio'
        },
        {
          from: 'utils/api.js',
          to: 'utils/api.js'
        }
      ]
    })
  ],
  resolve: {
    extensions: ['.js', '.json']
  },
  mode: 'development',
  devtool: 'source-map'
};