'use strict';
const community = require('./whatsapp-community.cjs');

module.exports = function homeArticles(articles, route, escape, photograph) {
 const published = articles.map((article, order) => ({article, order})).filter(({article}) => article.status === 'approved').sort((a, b) => b.article.publishedOn.localeCompare(a.article.publishedOn) || b.order - a.order).map(({article}) => article);
 if (!published.length) return '';
 const cards = published.map((article, index) => '<article class="home-article-card"' + (index ? ' hidden' : '') + '>' + (article.image ? '<div class="home-article-image">' + photograph(article, '', true) + '</div>' : '') + '<div><h3><a href="' + route(article) + '">' + escape(article.title) + '</a></h3><p>' + escape(article.description) + '</p><a class="text-link" href="' + route(article) + '">לקריאת המאמר<span class="sr-only">: ' + escape(article.title) + '</span> <span aria-hidden="true">←</span></a></div></article>').join('\n');
 return '<!-- home-articles:start -->\n<section class="section home-articles" aria-labelledby="home-articles-title" data-home-articles><div class="home-articles-heading"><h2 id="home-articles-title">מהשטח ומהמחקר</h2><a class="text-link" href="pages/articles/">לכל המאמרים <span aria-hidden="true">←</span></a></div><div class="home-articles-track">' + cards + '</div><div class="home-articles-controls" hidden><button type="button" data-article-prev aria-label="המאמר הקודם">→</button><span data-article-count dir="ltr">1 / ' + published.length + '</span><button type="button" data-article-next aria-label="המאמר הבא">←</button><button type="button" data-article-play>השהיה</button></div>' + community.invitation('home') + '</section>\n<!-- home-articles:end -->';
};
