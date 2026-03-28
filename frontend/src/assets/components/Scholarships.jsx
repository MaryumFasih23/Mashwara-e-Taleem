import React from "react";
import "./Scholarships.css";

export default function Scholarships() {
  return (
    <div className="sch-container">

      {/* PAGE TITLE */}
      <h1 className="sch-title">Scholarships</h1>

      <div className="sch-top">

        {/* FILTERS PANEL */}
        <div className="sch-filters">
          <h3>Filters</h3>

          <input
            type="text"
            placeholder="Enter scholarship name..."
            className="sch-search"
          />

          <label className="sch-label">Country</label>
          <div className="sch-checks">
            <label><input type="checkbox" /> USA</label>
            <label><input type="checkbox" /> UK</label>
            <label><input type="checkbox" /> Germany</label>
            <label><input type="checkbox" /> Australia</label>
            <label><input type="checkbox" /> France</label>
          </div>

          <label className="sch-label">Award Amount</label>
          <select className="sch-select">
            <option>Any</option>
            <option>Fully Funded</option>
            <option>Partial Funding</option>
          </select>

          <label className="sch-label">Scholarship Type</label>
          <div className="sch-checks">
            <label><input type="checkbox" /> Bachelor's</label>
            <label><input type="checkbox" /> Master's</label>
            <label><input type="checkbox" /> PhD</label>
          </div>

          <button className="sch-reset">Reset Filters</button>
        </div>

        {/* SCHOLARSHIP LIST */}
        <div className="sch-list">

          {/* SORT */}
          <div className="sch-sort">
            <span>Showing 2 scholarships</span>

            <div>
              Sort by:{" "}
              <select className="sch-sort-select">
                <option>Best Match</option>
                <option>Nearest Deadline</option>
              </select>
            </div>
          </div>

          {/* CARD 1 */}
          <div className="sch-card">
            <img
              src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPoAAACWCAMAAADABGUuAAAAXVBMVEXIEC7///8BIWnjh5but8D99/jYV2z43+PPMEqirsgWM3USMHORn778/P3N0+LGzd3u8PVwgqpfc6A5UooyTIbKGDXNJkL32t/XUWfVSWD11Nngd4j88fPrp7JmeaSupedcAAAEfElEQVR4nO2dWVvbMBBFlbJ2DW2BLtD+/5/ZZoMQy/bM3HvHeZj7xEeINEc6ZLEtuV3frMbz5fs7Rl4bbJN5/TtKt/frQ3OXj4O+bi9be7i4moB//4FQwyLoHz993jf24+egpw30bgAm2O++4lUsgf7tbt/U1cXDoKOt6kc/jgW3Ph99xvXjWrTWZ6PPuv62FqX1yejzrp/WorM+Fd3i+qAWmfWJ6DbXO7WIrM9Df3H9+WnY/InWMw+/TdT6LHSz6/1aFNbnoDtc39ViGJ7jhKxPQfe4vqtl+g2gk/X9OaL7XN/VYtXjKG7r5ehe1w/ojoHax2u9Gt34GaaH7nvKJr7Xei16wPUjdLH1SvSQ67tagkP23/q/54D+N+T6JusW/EfZxGy9DD3q+vblqiHKWK0XoYOFN3jwFkNHdW2cZvLR8enao2ut56Mzym0vrQmtp6NTJG3sBhPQSZN0jC6znopOK7K9bVdjPROdp2bTNa1AZ07NAF1hPQudW9oQXWA9CZ0sZA+d3gkFnT4hfXSyWgR0wb/hCDp3kHF0xYvvKDqzOxRd85Y7gc6TDENXfdCaQqcNN4Qu+3g9jU7qGEAXfqmaQ6foFkaXfpWeRWcMfBRdewDFgI6XEENXHzYzoaPiRdD1B0tt6OAUBNATDpFb0SHr/ehi153oiIJu9GhHntNhDnTE+hC6+CSoCx2x3o+uPvXtREett6PrL3jwooPWW9HFrgfRIeut6BkXN0XQkdP5RnRXo8FL2oZvKNJY0VNqSe6u0Au90Au90NNqSe6u0At9WfRKpVKpVCqVSqVSqVQqlUqlUqlUKpVKpVKpeHNOJ3aTa0nurtALvdALvdDTaknurtALfVl0bAFIJ50FMUfdBdF7q2x+/T48GlwAEnjOy7KfXi5vBzU+4uir1c318O+fnvcPJi37eV3s5S0QQu8P6p/DgwmLvbyuH2mJorOtjy7sdE8LAZ1sfXA5r7csEjrV+tAi7k7mXeegE60PLN33T4YfPayXYOl+3HVwwwb/QHM3bABcx7fpCHXJQkenIIIOisZBx0uIoeNDDqIzxIuia603b7+FDHwYXWq9ddM1qGMAXWi9bau9Tjy6Qegy6y0bLMLDjaGrrDdsq4l3h6JrrJ/dTLUTt2Q4usL6mS10OYNMQBdYP71xMqkTCjp9Qqa2y+4kphYJnVza+CbpnKGlonOFHN0aH29agc6cmpEbInQCfHhgovOK7N4GAx5QJTpNzd7NT6AGE9BJkzS85U0n6NdDOjql3NMbHSHDmIjOkLRxmslHx6erZRwA1KCjhbeMw74idFDXFn/yed3A0D1x65TT+UJ0wPpxdOKJPSV63PoxdOrpXC169LW+j04+ia9Gj1nfRZ9+eTjz21F30le4g86/YCcBPWD9AF1xmVYKut96w/Aglyklorutn3kYdT0V3Wn9jBSo68noLuvHB6UxXM9G91jf/eU+BNfz0e3Wd1XYhuL6EuhW60+H4hCS64ugG61faV1fCN1kvdj1bZZAN1gvdn2bRdBnrf8H/UjJxfy4F1sAAAAASUVORK5CYII="
              alt="UK flag"
              className="sch-img"
            />

            <div className="sch-info">
              <h2 className="sch-card-title">Chevening Scholarship</h2>
              <p>UK</p>
              <p>🎓 Fully Funded — Master's</p>

              <p className="sch-text">Acceptance Rate: <span className="red">5%</span></p>
              <p className="sch-text">Your Match: <span className="green">93%</span></p>

              <p className="sch-deadline">
                Deadline: November 7, 2025
              </p>
            </div>
          </div>

          {/* CARD 2 */}
          <div className="sch-card">
            <img
              src="https://upload.wikimedia.org/wikipedia/en/b/ba/Flag_of_Germany.svg"
              alt="Germany flag"
              className="sch-img"
            />

            <div className="sch-info">
              <h2 className="sch-card-title">DAAD Helmut Schmidt Program</h2>
              <p>Germany</p>
              <p>🎓 Fully Funded — Master's</p>

              <p className="sch-text">Acceptance Rate: <span className="red">9%</span></p>
              <p className="sch-text">Your Match: <span className="green">89%</span></p>

              <p className="sch-deadline">
                Deadline: July 31, 2026
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
