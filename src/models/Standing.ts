/**
 * Example:
 *     {
      "gp": 52,
      "rank": 1,
      "team": {
        "code": "VLH",
        "id": "VLH"
      },
      "team_code": "VLH",
      "diff": 41,
      "g": 153,
      "ga": 112,
      "non_reg_l": 7,
      "non_reg_non_w": 7,
      "non_reg_t": 0,
      "non_reg_w": 7,
      "otl": 6,
      "ott": 0,
      "otw": 4,
      "points": 102,
      "reg_l": 11,
      "reg_t": 0,
      "reg_w": 27,
      "sol": 1,
      "sow": 3
    },
 */

interface Standing {
    gp: number, 
    team_code: string,
    points: number,
    rank: number,
    diff: number,
}

export {
    Standing
}