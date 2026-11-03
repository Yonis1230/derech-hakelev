'use strict';

// Existing article addresses stay stable; an authored route may use /articles/.
module.exports = function articleRoute(article) {
 const standard = 'pages/articles/' + article.slug + '/';
 if (!article.route) return standard;
 if (article.route !== standard && article.route !== 'articles/' + article.slug + '/') throw new Error('Invalid article route: ' + article.slug);
 return article.route;
};
