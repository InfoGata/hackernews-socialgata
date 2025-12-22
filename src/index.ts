const pluginName = "hackernews";
const hackerNewsUrl = "https://news.ycombinator.com";
const algoliaUrl = "https://hn.algolia.com/api/v1";
const firebaseUrl = "https://hacker-news.firebaseio.com";

interface FirebaseStory {
  by: string;
  descendants: number;
  id: number;
  kids: number[];
  score: number;
  time: number;
  title: string;
  type: string;
  url: string;
  text?: string;
}

interface AlgoliaSearch {
  hits: (AlgoliaCommentHit | AlgoliaStoryHit)[];
  hitsPerPage: number;
  nbHits: number;
  nbPages: number;
  page: number;
}

interface AlgoliaCommentHit {
  story_title: string;
  story_id: number;
  parent_id: number;
  comment_text: string;
  author: string;
  created_at: string;
  objectID: string;
}

interface AlgoliaStoryHit {
  author: string;
  points: number;
  story_id: string;
  title: string;
  created_at: string;
  url: string;
  num_comments: number;
  objectID: string;
}

interface AlgoliaItemData {
  author: string;
  children: AlgoliaCommentItem[];
  created_at: string;
  id: number;
}

interface AlgoliaStoryItem extends AlgoliaItemData {
  type: "story";
  title: string;
  url: string;
  points: number;
  text?: string;
}

interface AlgoliaCommentItem extends AlgoliaItemData {
  type: "comment";
  text: string;
  parent_id: number;
}

async function getStory(id: number): Promise<FirebaseStory> {
  const path = `/v0/item/${id}.json`;
  const url = `${firebaseUrl}${path}`;
  const response = await application.networkRequest(url);
  const json: FirebaseStory = await response.json();
  return json;
}

async function getStoryIds(feedType: string): Promise<number[]> {
  let path: string;
  switch (feedType) {
    case "top":
      path = "/v0/topstories.json";
      break;
    case "new":
      path = "/v0/newstories.json";
      break;
    case "best":
      path = "/v0/beststories.json";
      break;
    case "ask":
      path = "/v0/askstories.json";
      break;
    case "show":
      path = "/v0/showstories.json";
      break;
    case "job":
      path = "/v0/jobstories.json";
      break;
    default:
      path = "/v0/topstories.json";
  }
  const url = `${firebaseUrl}${path}`;
  const response = await application.networkRequest(url);
  const json: number[] = await response.json();
  return json;
}

const firebaseStoryToPost = (story: FirebaseStory): Post => {
  return {
    apiId: story.id.toString(),
    title: story.title,
    publishedDate: new Date(story.time * 1000).toISOString(),
    url: story.url,
    body: story.text,
    authorName: story.by,
    authorApiId: story.by,
    originalUrl: `${hackerNewsUrl}/item?id=${story.id}`,
    score: story.score,
    numOfComments: story.descendants,
    pluginId: pluginName,
  };
};

const algoliaCommentToPost = (comment: AlgoliaCommentItem): Post => {
  return {
    apiId: comment.id.toString(),
    body: comment.text,
    publishedDate: comment.created_at,
    authorName: comment.author,
    authorApiId: comment.author,
    originalUrl: `${hackerNewsUrl}/item?id=${comment.id}`,
    parentId: comment.parent_id.toString(),
    comments: comment.children.map(algoliaCommentToPost),
    pluginId: pluginName,
  };
};

const algoliaStoryToPost = (story: AlgoliaStoryItem): Post => {
  return {
    apiId: story.id.toString(),
    title: story.title,
    publishedDate: story.created_at,
    url: story.url,
    body: story.text,
    authorName: story.author,
    authorApiId: story.author,
    originalUrl: `${hackerNewsUrl}/item?id=${story.id}`,
    score: story.points,
    pluginId: pluginName,
  };
};

const algoliaStoryHitToPost = (story: AlgoliaStoryHit): Post => {
  return {
    apiId: story.objectID,
    title: story.title,
    publishedDate: story.created_at,
    url: story.url,
    authorName: story.author,
    authorApiId: story.author,
    originalUrl: `${hackerNewsUrl}/item?id=${story.objectID}`,
    score: story.points,
    numOfComments: story.num_comments,
    pluginId: pluginName,
  };
};

const algoliaCommentHitToPost = (comment: AlgoliaCommentHit): Post => {
  return {
    apiId: comment.objectID,
    body: comment.comment_text,
    publishedDate: comment.created_at,
    authorName: comment.author,
    authorApiId: comment.author,
    parentId: comment.parent_id.toString(),
    originalUrl: `${hackerNewsUrl}/item?id=${comment.objectID}`,
    pluginId: pluginName,
  };
};

// Plugin Methods

const getFeed = async (request?: GetFeedRequest): Promise<GetFeedResponse> => {
  const storiesPerPage = 20;
  const currentPage = Number(request?.pageInfo?.page ?? 1);
  const startIndex = (currentPage - 1) * storiesPerPage;
  const feedTypeId = request?.feedTypeId ?? "top";

  const allIds = await getStoryIds(feedTypeId);
  const pageIds = allIds.slice(startIndex, startIndex + storiesPerPage);
  const stories = await Promise.all(pageIds.map(getStory));
  const items = stories.filter(Boolean).map(firebaseStoryToPost);

  items.forEach((item, index) => {
    item.number = (currentPage - 1) * storiesPerPage + index + 1;
  });

  return {
    items,
    pageInfo: {
      page: currentPage,
      nextPage:
        currentPage < Math.floor(allIds.length / storiesPerPage)
          ? currentPage + 1
          : undefined,
      prevPage: currentPage > 1 ? currentPage - 1 : undefined,
    },
    feedTypeId,
    feedTypes: [
      { displayName: "Top", id: "top" },
      { displayName: "New", id: "new" },
      { displayName: "Best", id: "best" },
      { displayName: "Ask HN", id: "ask" },
      { displayName: "Show HN", id: "show" },
      { displayName: "Jobs", id: "job" },
    ],
  };
};

const getComments = async (
  request: GetCommentsRequest
): Promise<GetCommentsResponse> => {
  const path = `/items/${request.apiId}`;
  const url = `${algoliaUrl}${path}`;
  const response = await application.networkRequest(url);
  const json: AlgoliaStoryItem = await response.json();
  const post = algoliaStoryToPost(json);
  const items = json.children.map(algoliaCommentToPost);
  return {
    post,
    items,
  };
};

const getUser = async (request: GetUserRequest): Promise<GetUserResponse> => {
  const path = `/search_by_date?tags=(comment,story),author_${request.apiId}`;
  const url = `${algoliaUrl}${path}`;
  const response = await application.networkRequest(url);
  const json: AlgoliaSearch = await response.json();
  const items = json.hits.map((h) =>
    "title" in h ? algoliaStoryHitToPost(h) : algoliaCommentHitToPost(h)
  );
  return {
    user: {
      apiId: request.apiId,
      name: request.apiId,
    },
    items,
  };
};

const search = async (request: SearchRequest): Promise<SearchResponse> => {
  const url = new URL(`${algoliaUrl}/search`);
  url.searchParams.append("query", request.query);
  url.searchParams.append("tags", "story");

  if (request.pageInfo?.page) {
    url.searchParams.append("page", String(request.pageInfo.page));
  }

  const response = await application.networkRequest(url.toString());
  const json: AlgoliaSearch = await response.json();
  const items = json.hits
    .filter((hit): hit is AlgoliaStoryHit => "title" in hit)
    .map((hit) => algoliaStoryHitToPost(hit));

  return {
    items,
    pageInfo: {
      page: json.page,
      nextPage: json.page < json.nbPages - 1 ? json.page + 1 : undefined,
      prevPage: json.page > 0 ? json.page - 1 : undefined,
    },
  };
};

// Theme handling
const changeTheme = (theme: Theme) => {
  localStorage.setItem("vite-ui-theme", theme);
};

// Initialize plugin
const init = async () => {
  const theme = await application.getTheme();
  changeTheme(theme);
};

// Wire up plugin handlers
application.onGetFeed = getFeed;
application.onGetComments = getComments;
application.onGetUser = getUser;
application.onSearch = search;
application.onGetPlatformType = async () => "forum";

application.onChangeTheme = async (theme: Theme) => {
  changeTheme(theme);
};

application.onPostLogin = init;
init();
