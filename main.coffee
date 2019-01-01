csscol = (c) ->
  [r,g,b,a] = c
  a = a or 1.0
  "rgba(#{r},#{g},#{b},#{a})" # GODDAMMIT, CSS CRUFT!

match = (d, opts) ->
  f = opts[d[0]] or opts.otherwise
  f.apply this, d[1..]

Object.prototype.match = match

class DisplayGrid

  constructor: (@width, @height) ->
    @cells = ([{overlays: []},["air"]] for x in [0...@width*@height])

  get_stack: (x,y) -> @cells[@width*y + x]

  mutate: (stmt) ->
    @match stmt, {
      POKE: (x, y, z, tile) -> (@get_stack x, y)[z + 1] = tile
      OVERLAY: (x, y, overlay, setting) ->
        o = (@get_stack x, y)[0].overlays
        m = overlay in o
        if setting is on and not m then o.push overlay
        else if m then o[o.indexOf overlay] = undefined
    }

  query: (query) ->
    @match query, {
      PEEK: (x, y, z) ->
        if 0 <= x < @width and 0 <= y < @height
          (@get_stack x, y)[z + 1] or ["air"]
        else
          ["air"]
      OVERLAY: (x, y, overlay) ->
        overlay in (@get_stack x, y)[0].overlays
    }

  draw: (l, pixPerTile, pixBorder, tile_colour, tile_size, ent_type) ->
    w = pixPerTile + pixBorder

    for row in [0...@height]
      for coln in [0...@width]
        stack = @get_stack coln, row

        for z in [0...stack.length-1]
          cell = stack[z+1]
          col = tile_colour cell

          if col?
            colstr = csscol col
            l.fillStyle colstr
            k = tile_size cell
            kt = k * pixPerTile
            sep = 0.5 * (1 - k) * pixPerTile
            c = [w * (coln + 0.5), w * (row + 0.5)]
            len = 2 * sep + pixBorder
            wid = kt * 0.6

            l.fillRect c[0] - kt/2, c[1] - kt/2, kt, kt

            if cell[0] is "head" or cell[0] is "tail"
              left = @query ["PEEK", coln-1, row, z]
              up   = @query ["PEEK", coln, row-1, z]

              left = (left[0] is "head" or left[0] is "tail") and cell[1] is left[1]
              up   = (up[0] is "head" or up[0] is "tail") and cell[1] is up[1]

              if left then l.fillRect c[0] - kt/2 - len-1,  c[1] - wid/2, len+2, wid
              if up   then l.fillRect c[0] - wid/2, c[1] - kt/2 - len-1, wid, len+2

    return

grid = new DisplayGrid 40, 30

entities = []
entID = 0
add_entity = (type) ->
  entities[entID] = type
  entID++
  entID - 1

ent_type = (id) -> entities[id] or id

uiPenInk = ["air"]
ui_pen_set = (inkType) ->
  uiPenInk = match inkType, {
    air:       -> inkType
    floor:     -> inkType
    credit:    -> inkType
    otherwise: -> ["head", inkType[0]]
  }

uiPenState = "up"
ui_pen_up = -> uiPenState = "up"
ui_pen_down = ->
  uiPenState = "down"
  ui_pen_stamp()

ui_pen_stamp = ->
  [x, y] = uiPenPos
  c = grid.query ["PEEK", x, y, 1]

  match uiPenInk, {
    air:    -> grid.mutate ["POKE", x, y, (if c[0] is "air" then 0 else 1), uiPenInk]
    floor:  -> grid.mutate ["POKE", x, y, 0, uiPenInk]
    credit: -> if c[0] is "air" then grid.mutate ["POKE", x, y, 1, uiPenInk]
    head: (type) ->
      if c[0] is "air"
        id = add_entity type
        grid.mutate ["POKE", x, y, 1, ["head", id]]
        uiPenInk = ["tail", id]
    tail: -> if c[0] is "air" then grid.mutate ["POKE", x, y, 1, uiPenInk]
  }

uiPenPos = [0,0]
ui_move_pen = (x, y) ->
  delta = [uiPenPos[0] - x, uiPenPos[1] - y]
  if delta[0] isnt 0 or delta[1] isnt 0
    uiPenPos = [x, y]
    ui_pen_stamp() if uiPenState is "down"

floorVars = [[ 85, 85, 85], [145,122,115], [120,138,109]]
entCols =
  hack:     [  0,255,255]
  datadoc:  [  0,  0,255]
  sentinel: [255,128,  0]
  warden:   [255,  0,  0]
  watchman: [255,  0,255]
tile_colour = (cell) ->
  match cell, {
    air: -> null
    floor: (variant) -> floorVars[variant][0..3]
    credit: -> [0, 255, 0]
    head: (entity) ->
      col = entCols[ent_type entity]
      [(Math.floor col[0] * 0.7), (Math.floor col[1] * 0.7), (Math.floor col[2] * 0.7)]
    tail: (entity) ->
      entCols[ent_type entity][0..2]
  }

tile_size = (cell) ->
  match cell, {
    floor: -> 1
    credit: -> 0.4
    otherwise: -> 0.9
  }

pixPerTile = 32
pixBorder = 4
pixTotal = pixPerTile + pixBorder
app = new PLAYGROUND.Application {
  render: ->
    l = this.layer
    w = pixTotal

    l.clear "#0a0a0a"
    grid.draw l, pixPerTile, pixBorder, tile_colour, tile_size, ent_type

    # Pen
    col = tile_colour uiPenInk
    if col?
      col[3] = 0.6
      colstr = csscol col
      l.fillStyle colstr
      l.fillRect w*uiPenPos[0] + pixBorder/2, w*uiPenPos[1] + pixBorder/2, pixPerTile, pixPerTile
    l.lineWidth 2
     .strokeStyle "rgba(255,255,255,0.6)"
     .strokeRect w*uiPenPos[0], w*uiPenPos[1], w, w

  #                        Royale Decree on þe Variouſ Claſſificationnes of Inputtes
  #                   --------------------------------------------------------------------
  #   I  Þe Mouſe Pointre ſhall be for þe Attainmente of Poſitionnes on þe Grille, for þat is its Purpoſe by God Himſelfe,
  #  II  Þe Keyboard ſhall be for þe Attainment of Textual Informationnes, þat alſo beinge Ordainde by þe Lord, exceptinge whereby,
  # III  Þoſe Keyes ſet aſide by þe Lord for þe Purpoſe of Interactionne, includinge but not limited to þe Keyes of Arrowes,
  #  IV  Þe Wheele of Scrollinge ſhall be, for a limited Time, þe Purveyor of Cell Types.
  #                                         ~ HÆC DICIT DOMINUS ~

  pointermove: (ev) ->
    x = Math.floor ev.x / pixTotal
    y = Math.floor ev.y / pixTotal
    ui_move_pen x, y

  palette: [["floor",0], ["floor",1], ["floor",2], ["credit",100], ["hack"], ["datadoc"], ["sentinel"], ["warden"], ["watchman"]]
  brush: 0
  pointerdown: (ev) ->
    if ev.button is "left"
      ui_pen_set @palette[@brush]
    else if ev.button is "right"
      ui_pen_set ["air"]

    ui_pen_down()

  pointerup: (ev) ->
    if ev.button is "right"
      ui_pen_set @palette[@brush]
    ui_pen_up()

  pointerwheel: (ev) ->
    @brush += ev.delta;
    if @brush < 0 then @brush += @palette.length
    else if @brush >= @palette.length then @brush -= @palette.length
    ui_pen_set @palette[@brush]
}
