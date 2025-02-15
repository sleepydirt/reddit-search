document
  .getElementById("searchForm")
  .addEventListener("submit", function (event) {
    event.preventDefault();

    const formData = {
      q: document.getElementById("q").value,
      subreddit: document.getElementById("subreddit").value,
      kind: document.getElementById("kind").value,
      size: document.getElementById("size").value,
      since: document.getElementById("since").value,
      until: document.getElementById("until").value,
      author: document.getElementById("author").value,
    };

    document.getElementById("loadingIndicator").style.display = "block";
    const formElements = document.querySelectorAll(
      "#searchForm input, #searchForm select, #searchForm button"
    );
    formElements.forEach((element) => {
      element.disabled = true;
    });

    fetch("/search", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    })
      .then((response) => {
        // Check for non-ok responses (like 400, 500 errors)
        if (!response.ok) {
          return response.json().then((errData) => {
            throw new Error(errData.error || "Unknown server error"); // Prefer error message from server
          });
        }
        return response.json();
      })
      .then((data) => {
        document.getElementById("loadingIndicator").style.display = "none";
        formElements.forEach((element) => {
          element.disabled = false;
        });
        const resultsDiv = document.getElementById("results");
        resultsDiv.innerHTML = ""; // Clear previous results

        // If the API returned a message (e.g., no results), display it
        if (data.message) {
          resultsDiv.innerHTML = `<div class="notification is-info">${data.message}</div>`;
          return;
        }

        if (data.length === 0) {
          resultsDiv.innerHTML = `<div class="notification is-warning">No results found.</div>`;
          return;
        }

        let contentHTML = ""; // Initialize contentHTML here
        data.forEach((item) => {
          const title = `${item.title || item.id} | u/${item.author}`;
          const score = item.score || 0; //handle missing score
          const created_utc = new Date(
            item.created_utc * 1000
          ).toLocaleString();
          const url = `https://reddit.com${item.permalink}`;
          let highlightRegex;

          if (formData.q.trim() !== "") {
            try {
              // Handle special characters in search query for regex
              const escapedQ = formData.q.replace(
                /[.*+?^${}()|[\]\\]/g,
                "\\$&"
              ); // Escape regex special chars
              highlightRegex = new RegExp(
                `(${escapedQ.split(/\s+/).join("|")})`,
                "gi"
              ); //split by spaces, join w/ OR
            } catch (e) {
              console.error("Error creating highlight regex", e);
              highlightRegex = null; // Set to null if creation failed
            }
          } else {
            highlightRegex = null;
          }
          // Display differently for submissions and comments
          contentHTML += `
                    <div class="card mb-3">
                        <div class="card-content">
                            <p class="title is-5">
                                <a href="${url}" target="_blank">${title}</a>
              ${
                formData.kind === "comment"
                  ? `<span class="is-size-6 has-text-grey"> (comment)</span>`
                  : ""
              }
                            </p>
                            <p class="subtitle is-6">Score: ${score} | Posted: ${created_utc}</p>
                            ${
                              formData.kind === "submission" &&
                              item.selftext_html
                                ? `<div class="content">${
                                    highlightRegex
                                      ? item.selftext_html.replace(
                                          highlightRegex,
                                          "<mark>$1</mark>"
                                        )
                                      : item.selftext_html
                                  }</div>`
                                : ""
                            }
                            ${
                              formData.kind === "comment" && item.body_html
                                ? `<div class="content">${
                                    highlightRegex
                                      ? item.body_html.replace(
                                          highlightRegex,
                                          "<mark>$1</mark>"
                                        )
                                      : item.body_html
                                  }</div>`
                                : ""
                            }

                        </div>
                    </div>
                `;
        });

        resultsDiv.innerHTML = contentHTML; // Set all results at once
      })
      .catch((error) => {
        // --- Hide loading indicator and re-enable form (also on error) ---
        document.getElementById("loadingIndicator").style.display = "none";
        formElements.forEach((element) => {
          element.disabled = false;
        });
        console.error("Error:", error);
        document.getElementById(
          "results"
        ).innerHTML = `<div class="notification is-danger">An error occurred: ${error.message}</div>`;
      });
  });
