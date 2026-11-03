---
layout: none
title: 中文
permalink: /zh/
nav: false
sitemap: false
---

<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Chenning Tao</title>
    <link rel="canonical" href="https://chenning-tao.github.io/">
    <script>
      // Compatibility for old bookmarks: one homepage, with a saved language choice.
      var home = new URL({{ '/' | relative_url | jsonify }}, window.location.origin);
      home.search = window.location.search;
      home.searchParams.set("lang", "zh");
      home.hash = window.location.hash;
      window.location.replace(home.href);
    </script>
  </head>
  <body>
    <p>主页现已支持中英文切换。<a href="/">前往主页 / Go to homepage</a></p>
  </body>
</html>
