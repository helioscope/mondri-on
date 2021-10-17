# About Mondri-on

Mondri-on is a little art tool for making axis-aligned-box images (like the famous works of [Piet Mondrian](https://en.wikipedia.org/wiki/Piet_Mondrian)). It's based on Binary Space Partitioning ("BSP") — you split the rectangle of the canvas to make two rectangles, then split those rectangles, and keep splitting to form your composition. Along the way, you can color/recolor those rectangles to make things more interesting.

This was built pretty quickly for the 2021 "Tool Jam" on itch.io, based on some C# BSP code I was working on for 3D compositions in Unity.


This requires [node](https://nodejs.dev/). Once you've installed it, you can run `npm install` from the root to install the other dependencies. After that, you can run the usual `npm start` to run the app in the development mode ([http://localhost:5000](http://localhost:5000) by default) or `npm run build` to bundle the app for distribution.
