/*
 * Posts shown in the "Work" section.
 *
 * While `items` is empty, the section and its links in the navigation stay off the page.
 *
 * Add real posts only, and only ones you may show: your own, or posts by people you
 * represent who have agreed in writing. Copy every figure from the post itself, and
 * put the date you copied them in `asOf`. The page prints that date under the wall.
 *
 * Each item:
 *   url        Link to the post on X. Required.
 *   name       The author's display name. Required.
 *   handle     Their X handle, without the @. Required.
 *   date       Date of the post, written as "2026-11-12".
 *   text       The opening of the post. The page cuts long text off by itself.
 *   verified   true if the account is verified on X.
 *   avatar     Path to their picture, e.g. "assets/posts/jane.jpg". Optional.
 *   image      Path to a still from the post's image or video, e.g.
 *              "assets/posts/jane-launch.jpg". Leave it out for a text-only post:
 *              the card then shows the words larger instead.
 *   alt        A few words describing that image.
 *   views, replies, reposts, likes, bookmarks
 *              Plain figures, e.g. 12000000. Leave out any you don't have.
 *
 * Example:
 *   {
 *     url: "https://x.com/handle/status/1234567890",
 *     name: "Jane Example", handle: "handle", verified: true, date: "2026-11-12",
 *     text: "The opening lines of the post.",
 *     avatar: "assets/posts/jane.jpg", image: "assets/posts/jane-launch.jpg", alt: "Jane at her desk",
 *     views: 1200000, replies: 240, reposts: 310, likes: 5200, bookmarks: 1900
 *   }
 *
 * To check the layout before you have posts, open the site with ?wall=sample added
 * to the address. That fills the wall with placeholder cards, labelled as samples.
 */
window.POSTS = {
  asOf: "",
  items: []
};
