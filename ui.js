$(async function() {
  // cache some selectors we'll be using quite a bit
  const $allStoriesList = $("#all-articles-list");
  const $submitForm = $("#submit-form");
  const $filteredArticles = $("#filtered-articles");
  const $favoritedArticles = $("#favorited-articles");
  const $myArticles = $("#my-articles");
  const $loginForm = $("#login-form");
  const $createAccountForm = $("#create-account-form");
  const $ownStories = $("#my-articles");
  const $navAll = $("#nav-all");
  const $navLogin = $("#nav-login");
  const $navSubmit = $("#nav-submit");
  const $navFavorites = $("#nav-favorites");
  const $navMyStories = $("#nav-my-stories");
  const $navLogOut = $("#nav-logout");

  // global storyList variable
  let storyList = null;

  // global currentUser variable
  let currentUser = null;

  // Load everything if logged in
  await checkIfLoggedIn();

  async function bindOnClicks() {
    /**
     * Event listener for logging in.
     *  If successfully we will setup the user instance
     */

    $loginForm.on("submit", async function(evt) {
      evt.preventDefault(); // no page-refresh on submit

      // grab the username and password
      const username = $("#login-username").val();
      const password = $("#login-password").val();

      // call the login static method to build a user instance
      const userInstance = await User.login(username, password);
      // set the global user to the user instance
      currentUser = userInstance;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    });

    /**
     * Event listener for signing up.
     *  If successfully we will setup a new user instance
     */

    $createAccountForm.on("submit", async function(evt) {
      evt.preventDefault(); // no page refresh

      // grab the required fields
      let name = $("#create-account-name").val();
      let username = $("#create-account-username").val();
      let password = $("#create-account-password").val();

      // call the create method, which calls the API and then builds a new user instance
      const newUser = await User.create(username, password, name);
      currentUser = newUser;
      syncCurrentUserToLocalStorage();
      loginAndSubmitForm();
    });

    // COMMENTED OUT BELOW B/C PUT INTO STARTED CODE ON LISTENER FOR BODY -> ALL-NAV
    /**
     * Event listener for navbar "submit" (opens form for a new post)".
     *  If successfully we will setup the user instance
     */

    // $navAll.on("click", async function(evt) {
    //   $allStoriesList.show();
    //   $favoritedArticles.hide();
    //   // await bindOnClicks();
    // });

    /**
     * Event listener for navbar "submit" (opens form for a new post)".
     *  If successfully we will setup the user instance
     */

    $navSubmit.on("click", async function(evt) {
      $submitForm.slideToggle();
    });

    /**
     * Event listener for navbar "submit" (opens form for a new post)".
     *  If successfully we will setup the user instance
     */

    $navFavorites.on("click", async function(evt) {
      $favoritedArticles.empty();
      generateFavorites();
      $submitForm.slideUp();
      $myArticles.fadeOut();
      $allStoriesList.fadeOut();
      $favoritedArticles.fadeIn();
      // await bindOnClicks();
    });

    $navMyStories.on("click", async function(evt) {
      $myArticles.empty();
      generateMyStories();
      $submitForm.slideUp();
      $allStoriesList.fadeOut();
      $favoritedArticles.fadeOut();
      $myArticles.fadeIn();
    });

    /**
     * Event listener for submitting new story
     */

    $submitForm.on("submit", async function(evt) {
      let newStory = {
        author: $("#author").val(),
        title: $("#title").val(),
        url: $("#url").val()
      };
      const storyList = await StoryList.getStories();
      // console.log(newStory);
      let addedStory = await storyList.addStory(currentUser, newStory);
      // console.log(addedStory);
      const result = generateStoryHTML(addedStory);
      $allStoriesList.prepend(result);
      $submitForm.slideUp();
      $("#author").val("");
      $("#title").val("");
      $("#url").val("");
    });

    $("body").on("click", ".trash", async function(evt) {});

    /**
     * Event listener for star/favorite button
     */

    $("body").on("click", ".favorite", async function(evt) {
      // We used favorite-storyId for ids of favorite html items
      // this grabs storyId out in both cases
      let storyId = $(evt.target)
        .parent()
        .attr("id")
        .split("favorite-");
      storyId = storyId[storyId.length - 1];
      console.log("after first split", storyId);
      storyId = storyId.split("mystory-");
      storyId = storyId[storyId.length - 1];
      console.log("after 2nd split", storyId);

      // If star is filled (is a favorite)
      if (checkIfFavoriteById(storyId)) {
        // Empty the star
        $(`.btn${storyId}`).removeClass("fas");
        $(`.btn${storyId}`).addClass("far");

        // DELETE api call to remove from server favorites
        let newFavorites = await StoryList.removeFavorite(currentUser, storyId);
        // Update currentUser.favorites
        currentUser.favorites = newFavorites;

        // HELPER STILL EXISTS BUT LINE REPLACED BY LINE ABOVE
        // deleteFavoriteById(storyId);

        // COMMENTED OUT B/C DELETE IS NOT EXPECTED FUNCTIONALITY
        // Delete item from $favoritedArticles (HTML favorites list)
        // let favoriteArticle = $(`#favorite-${storyId}`);
        // console.log(favoriteArticle);
        // favoriteArticle.remove();
      }
      // If star is not filled (not yet favorited)
      else {
        // POST api call to add to server favorites
        let newFavorites = await StoryList.addFavorite(currentUser, storyId);
        // Update currentUser.favorites
        currentUser.favorites = newFavorites;

        // HELPER STILL EXISTS BUT LINE REPLACED BY LINE ABOVE
        // await addFavoriteById(storyId);
        let story = await getStoryById(storyId);
        $favoritedArticles.append(generateFavoriteStoryHTML(story));
        // Fill the star
        $(`.btn${storyId}`).addClass("fas");
        $(`.btn${storyId}`).removeClass("far");
      }
    });

    /**
     * Log Out Functionality
     */

    $navLogOut.on("click", function() {
      // empty out local storage
      localStorage.clear();
      // refresh the page, clearing memory
      location.reload();
    });

    /**
     * Event Handler for Clicking Login
     */

    $navLogin.on("click", function() {
      // Show the Login and Create Account Forms
      $loginForm.slideToggle();
      $createAccountForm.slideToggle();
      $allStoriesList.toggle();
    });

    /**
     * Event handler for Navigation to Homepage
     */

    $("body").on("click", "#nav-all", async function() {
      hideElements();
      // await generateStories();
      // $allStoriesList.show();
      $allStoriesList.fadeIn();
      $favoritedArticles.fadeOut();
    });
  }

  /**
   * On page load, checks local storage to see if the user is already logged in.
   * Renders page information accordingly.
   */

  async function checkIfLoggedIn() {
    // let's see if we're logged in
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");

    // if there is a token in localStorage, call User.getLoggedInUser
    //  to get an instance of User with the right details
    //  this is designed to run once, on page load
    currentUser = await User.getLoggedInUser(token, username);
    await generateStories();
    await bindOnClicks();

    if (currentUser) {
      showNavForLoggedInUser();
    }
  }

  function checkIfFavorite(story) {
    return currentUser.favorites.includes(story);
  }

  function checkIfFavoriteById(storyId) {
    // console.log(currentUser.favorites);
    // return currentUser.favorites.some(story => story.id === storyId
    // );
    for (story of currentUser.favorites) {
      // console.log(story);
      if (story.storyId === storyId) {
        return true;
      }
    }
    return false;
  }

  function deleteFavoriteById(storyId) {
    // console.log(currentUser.favorites);
    for (let i = 0; i < currentUser.favorites.length; i++) {
      // console.log(story);
      if (currentUser.favorites[i].storyId === storyId) {
        currentUser.favorites.splice(i, 1);
      }
    }
  }

  async function addFavoriteById(storyId) {
    const storyList = await (await StoryList.getStories()).stories;
    for (let i = 0; i < storyList.length; i++) {
      if (storyList[i].storyId === storyId) {
        currentUser.favorites.push(storyList[i]);
      }
    }
  }

  async function getStoryById(storyId) {
    const storyList = await (await StoryList.getStories()).stories;
    for (let i = 0; i < storyList.length; i++) {
      if (storyList[i].storyId === storyId) {
        return storyList[i];
      }
    }
  }

  /**
   * A rendering function to run to reset the forms and hide the login info
   */

  function loginAndSubmitForm() {
    // hide the forms for logging in and signing up
    $loginForm.hide();
    $createAccountForm.hide();

    // reset those forms
    $loginForm.trigger("reset");
    $createAccountForm.trigger("reset");

    // show the stories
    $allStoriesList.show();

    // update the navigation bar
    showNavForLoggedInUser();
  }

  /**
   * A rendering function to call the StoryList.getStories static method,
   *  which will generate a storyListInstance. Then render it.
   */

  async function generateStories() {
    // console.log(currentUser.favorites);
    // get an instance of StoryList
    const storyListInstance = await StoryList.getStories();
    // update our global variable
    storyList = storyListInstance;
    // empty out that part of the page
    $allStoriesList.empty();

    // loop through all of our stories and generate HTML for them
    for (let story of storyList.stories) {
      const result = generateStoryHTML(story);
      $allStoriesList.append(result);
      if (checkIfFavorite(story)) {
        $(`.btn${story.storyId}`).removeClass("far");
        $(`.btn${story.storyId}`).addClass("fas");
      }
    }
    // build HTML of favorites page
    generateFavorites();
    // build HTML of my stories page
    generateMyStories();
  }

  function generateFavorites() {
    // loop through all of our favorited stories and generate HTML for them (hidden)
    for (let story of currentUser.favorites) {
      const result = generateFavoriteStoryHTML(story);
      result.addClass("favorite-article");
      // console.log(result[0].outerHTML);
      $favoritedArticles.append(result);
      if (checkIfFavorite(story)) {
        $(`.btn${story.storyId}`).removeClass("far");
        $(`.btn${story.storyId}`).addClass("fas");
      }
    }
  }

  function generateMyStories() {
    // loop through all of our favorited stories and generate HTML for them (hidden)
    for (let story of currentUser.ownStories) {
      console.log(story);
      const result = generateMyStoryHTML(story);
      result.addClass("my-article");
      // console.log(result[0].outerHTML);
      $myArticles.append(result);
    }
  }

  /**
   * A function to render HTML for an individual Story instance
   */

  function generateStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="${story.storyId}">
      <i class="favorite far fa-star btn${story.storyId}"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /**
   * A function to render HTML for an individual My Favorites Story instance
   */

  function generateFavoriteStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="favorite-${story.storyId}">
      <i class="favorite far fa-star btn${story.storyId}"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /**
   * A function to render HTML for an My Stories Story instance
   */

  function generateMyStoryHTML(story) {
    let hostName = getHostName(story.url);

    // render story markup
    const storyMarkup = $(`
      <li id="mystory-${story.storyId}">
      <i class="trash fas fa-trash-alt del${story.storyId}"></i>
      <i class="favorite far fa-star btn${story.storyId}"></i>
        <a class="article-link" href="${story.url}" target="a_blank">
          <strong>${story.title}</strong>
        </a>
        <small class="article-author">by ${story.author}</small>
        <small class="article-hostname ${hostName}">(${hostName})</small>
        <small class="article-username">posted by ${story.username}</small>
      </li>
    `);

    return storyMarkup;
  }

  /* hide all elements in elementsArr */

  function hideElements() {
    const elementsArr = [
      $submitForm,
      $allStoriesList,
      $filteredArticles,
      $ownStories,
      $loginForm,
      $createAccountForm
    ];
    elementsArr.forEach($elem => $elem.hide());
  }

  function showNavForLoggedInUser() {
    $navLogin.hide();
    $navLogOut.show();

    $navSubmit.show();
    $navFavorites.show();
    $navMyStories.show();
  }

  /* simple function to pull the hostname from a URL */

  function getHostName(url) {
    let hostName;
    if (url.indexOf("://") > -1) {
      hostName = url.split("/")[2];
    } else {
      hostName = url.split("/")[0];
    }
    if (hostName.slice(0, 4) === "www.") {
      hostName = hostName.slice(4);
    }
    return hostName;
  }

  /* sync current user information to localStorage */

  function syncCurrentUserToLocalStorage() {
    if (currentUser) {
      localStorage.setItem("token", currentUser.loginToken);
      localStorage.setItem("username", currentUser.username);
    }
  }
});
