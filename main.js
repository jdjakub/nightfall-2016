var DisplayGrid, add_entity, app, csscol, entCols, entID, ent_type, entities, floorVars, grid, match, pixBorder, pixPerTile, pixTotal, tile_colour, tile_size, uiPenInk, uiPenPos, uiPenState, ui_move_pen, ui_pen_down, ui_pen_set, ui_pen_stamp, ui_pen_up,
  indexOf = [].indexOf || function(item) { for (var i = 0, l = this.length; i < l; i++) { if (i in this && this[i] === item) return i; } return -1; };

csscol = function(c) {
  var a, b, g, r;
  r = c[0], g = c[1], b = c[2], a = c[3];
  a = a || 1.0;
  return "rgba(" + r + "," + g + "," + b + "," + a + ")";
};

match = function(d, opts) {
  var f;
  f = opts[d[0]] || opts.otherwise;
  return f.apply(this, d.slice(1));
};

Object.prototype.match = match;

DisplayGrid = (function() {
  function DisplayGrid(width, height) {
    var x;
    this.width = width;
    this.height = height;
    this.cells = (function() {
      var i, ref, results;
      results = [];
      for (x = i = 0, ref = this.width * this.height; 0 <= ref ? i < ref : i > ref; x = 0 <= ref ? ++i : --i) {
        results.push([
          {
            overlays: []
          }, ["air"]
        ]);
      }
      return results;
    }).call(this);
  }

  DisplayGrid.prototype.get_stack = function(x, y) {
    return this.cells[this.width * y + x];
  };

  DisplayGrid.prototype.mutate = function(stmt) {
    return this.match(stmt, {
      POKE: function(x, y, z, tile) {
        return (this.get_stack(x, y))[z + 1] = tile;
      },
      OVERLAY: function(x, y, overlay, setting) {
        var m, o;
        o = (this.get_stack(x, y))[0].overlays;
        m = indexOf.call(o, overlay) >= 0;
        if (setting === true && !m) {
          return o.push(overlay);
        } else if (m) {
          return o[o.indexOf(overlay)] = void 0;
        }
      }
    });
  };

  DisplayGrid.prototype.query = function(query) {
    return this.match(query, {
      PEEK: function(x, y, z) {
        if ((0 <= x && x < this.width) && (0 <= y && y < this.height)) {
          return (this.get_stack(x, y))[z + 1] || ["air"];
        } else {
          return ["air"];
        }
      },
      OVERLAY: function(x, y, overlay) {
        return indexOf.call((this.get_stack(x, y))[0].overlays, overlay) >= 0;
      }
    });
  };

  DisplayGrid.prototype.draw = function(l, pixPerTile, pixBorder, tile_colour, tile_size, ent_type) {
    var c, cell, col, coln, colstr, i, j, k, kt, left, len, n, ref, ref1, ref2, row, sep, stack, up, w, wid, z;
    w = pixPerTile + pixBorder;
    for (row = i = 0, ref = this.height; 0 <= ref ? i < ref : i > ref; row = 0 <= ref ? ++i : --i) {
      for (coln = j = 0, ref1 = this.width; 0 <= ref1 ? j < ref1 : j > ref1; coln = 0 <= ref1 ? ++j : --j) {
        stack = this.get_stack(coln, row);
        for (z = n = 0, ref2 = stack.length - 1; 0 <= ref2 ? n < ref2 : n > ref2; z = 0 <= ref2 ? ++n : --n) {
          cell = stack[z + 1];
          col = tile_colour(cell);
          if (col != null) {
            colstr = csscol(col);
            l.fillStyle(colstr);
            k = tile_size(cell);
            kt = k * pixPerTile;
            sep = 0.5 * (1 - k) * pixPerTile;
            c = [w * (coln + 0.5), w * (row + 0.5)];
            len = 2 * sep + pixBorder;
            wid = kt * 0.6;
            l.fillRect(c[0] - kt / 2, c[1] - kt / 2, kt, kt);
            if (cell[0] === "head" || cell[0] === "tail") {
              left = this.query(["PEEK", coln - 1, row, z]);
              up = this.query(["PEEK", coln, row - 1, z]);
              left = (left[0] === "head" || left[0] === "tail") && cell[1] === left[1];
              up = (up[0] === "head" || up[0] === "tail") && cell[1] === up[1];
              if (left) {
                l.fillRect(c[0] - kt / 2 - len - 1, c[1] - wid / 2, len + 2, wid);
              }
              if (up) {
                l.fillRect(c[0] - wid / 2, c[1] - kt / 2 - len - 1, wid, len + 2);
              }
            }
          }
        }
      }
    }
  };

  return DisplayGrid;

})();

grid = new DisplayGrid(40, 30);

entities = [];

entID = 0;

add_entity = function(type) {
  entities[entID] = type;
  entID++;
  return entID - 1;
};

ent_type = function(id) {
  return entities[id] || id;
};

uiPenInk = ["air"];

ui_pen_set = function(inkType) {
  return uiPenInk = match(inkType, {
    air: function() {
      return inkType;
    },
    floor: function() {
      return inkType;
    },
    credit: function() {
      return inkType;
    },
    otherwise: function() {
      return ["head", inkType[0]];
    }
  });
};

uiPenState = "up";

ui_pen_up = function() {
  return uiPenState = "up";
};

ui_pen_down = function() {
  uiPenState = "down";
  return ui_pen_stamp();
};

ui_pen_stamp = function() {
  var c, x, y;
  x = uiPenPos[0], y = uiPenPos[1];
  c = grid.query(["PEEK", x, y, 1]);
  return match(uiPenInk, {
    air: function() {
      return grid.mutate(["POKE", x, y, (c[0] === "air" ? 0 : 1), uiPenInk]);
    },
    floor: function() {
      return grid.mutate(["POKE", x, y, 0, uiPenInk]);
    },
    credit: function() {
      if (c[0] === "air") {
        return grid.mutate(["POKE", x, y, 1, uiPenInk]);
      }
    },
    head: function(type) {
      var id;
      if (c[0] === "air") {
        id = add_entity(type);
        grid.mutate(["POKE", x, y, 1, ["head", id]]);
        return uiPenInk = ["tail", id];
      }
    },
    tail: function() {
      if (c[0] === "air") {
        return grid.mutate(["POKE", x, y, 1, uiPenInk]);
      }
    }
  });
};

uiPenPos = [0, 0];

ui_move_pen = function(x, y) {
  var delta;
  delta = [uiPenPos[0] - x, uiPenPos[1] - y];
  if (delta[0] !== 0 || delta[1] !== 0) {
    uiPenPos = [x, y];
    if (uiPenState === "down") {
      return ui_pen_stamp();
    }
  }
};

floorVars = [[85, 85, 85], [145, 122, 115], [120, 138, 109]];

entCols = {
  hack: [0, 255, 255],
  datadoc: [0, 0, 255],
  sentinel: [255, 128, 0],
  warden: [255, 0, 0],
  watchman: [255, 0, 255]
};

tile_colour = function(cell) {
  return match(cell, {
    air: function() {
      return null;
    },
    floor: function(variant) {
      return floorVars[variant].slice(0, 4);
    },
    credit: function() {
      return [0, 255, 0];
    },
    head: function(entity) {
      var col;
      col = entCols[ent_type(entity)];
      return [Math.floor(col[0] * 0.7), Math.floor(col[1] * 0.7), Math.floor(col[2] * 0.7)];
    },
    tail: function(entity) {
      return entCols[ent_type(entity)].slice(0, 3);
    }
  });
};

tile_size = function(cell) {
  return match(cell, {
    floor: function() {
      return 1;
    },
    credit: function() {
      return 0.4;
    },
    otherwise: function() {
      return 0.9;
    }
  });
};

pixPerTile = 32;

pixBorder = 4;

pixTotal = pixPerTile + pixBorder;

app = new PLAYGROUND.Application({
  render: function() {
    var col, colstr, l, w;
    l = this.layer;
    w = pixTotal;
    l.clear("#0a0a0a");
    grid.draw(l, pixPerTile, pixBorder, tile_colour, tile_size, ent_type);
    col = tile_colour(uiPenInk);
    if (col != null) {
      col[3] = 0.6;
      colstr = csscol(col);
      l.fillStyle(colstr);
      l.fillRect(w * uiPenPos[0] + pixBorder / 2, w * uiPenPos[1] + pixBorder / 2, pixPerTile, pixPerTile);
    }
    return l.lineWidth(2).strokeStyle("rgba(255,255,255,0.6)").strokeRect(w * uiPenPos[0], w * uiPenPos[1], w, w);
  },
  pointermove: function(ev) {
    var x, y;
    x = Math.floor(ev.x / pixTotal);
    y = Math.floor(ev.y / pixTotal);
    return ui_move_pen(x, y);
  },
  palette: [["floor", 0], ["floor", 1], ["floor", 2], ["credit", 100], ["hack"], ["datadoc"], ["sentinel"], ["warden"], ["watchman"]],
  brush: 0,
  pointerdown: function(ev) {
    if (ev.button === "left") {
      ui_pen_set(this.palette[this.brush]);
    } else if (ev.button === "right") {
      ui_pen_set(["air"]);
    }
    return ui_pen_down();
  },
  pointerup: function(ev) {
    if (ev.button === "right") {
      ui_pen_set(this.palette[this.brush]);
    }
    return ui_pen_up();
  },
  pointerwheel: function(ev) {
    this.brush += ev.delta;
    if (this.brush < 0) {
      this.brush += this.palette.length;
    } else if (this.brush >= this.palette.length) {
      this.brush -= this.palette.length;
    }
    return ui_pen_set(this.palette[this.brush]);
  }
});
