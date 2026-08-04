const starButtons = document.querySelectorAll(".star-button");

starButtons.forEach((starButton) => {
  starButton.addEventListener("click", () => {
    const selectedRating = Number(starButton.dataset.rating);

    starButtons.forEach((button) => {
      const buttonRating = Number(button.dataset.rating);
      button.classList.toggle("selected", buttonRating <= selectedRating);
    });
  });
});
