## This is an accompanying R script for the main script: dygraph-extra.js
## Refer to the README or the JavaScript file for more details.

dyExtraHead =
  ## Collection of tags you would usually want to add to
  ##  `tags$head` when using dygraph-extra in shiny.
  ## e.g. tags$head(dyExtraHead())
   function() tagList(
      ## Load the JS library, this should be located within
      ##  the /www/ subfolder of the shiny app.
      tags$script(src = "dygraph-extra.js"),
      ## Ensure dygraphs resize correctly on tab switch
      tags$script('Dygraph.Export.ShinyTabResize();'),
      ## Ensure dygraphs clears selection correctly on mouseleave
      tags$script('Dygraph.Export.AutoClear();')
  )

dyRegister =
  ## Pass to drawCallback when creating a dygraph
  ## e.g. dyCallbacks(drawCallback = dyRegister())
  function() "Dygraph.Export.Register"

dyDownload =
  ## Create a link with given label
  ## When clicked, will prompt user to download:
  ##  - a png image of the dygraph with given id, if a single id
  ##  - a zip containing pngs of all dygraphs with given ids, for multiple ids
  ## elid (id of the <a> link) can be optionally specified
  ## If usetitle is TRUE, the filename will use the dygraph's main-title
  ##             if FALSE, the filename will be the id
  ## If asbutton is TRUE, the link will be styled as a nice looking button
  ## Class allows user to define the button class or other css. Defaults to btn-default.
  function(id, label, elid = NULL, usetitle = TRUE, asbutton = FALSE, class= "btn-default"){
    enc = function(x){
      if(is.logical(x)) ifelse(x, "true", "false")
      else encodeString(x, quote = '"')
    }
    encid = if(length(id) > 1)
      paste0("[", paste(enc(id), collapse = ","), "]")
    else enc(id)
    
    if(is.null(elid)) elid = paste0(id[1], "-dyDownload")
    out = tags$a(id = elid, class = "download-link",
                 href = "#", label, onclick =
                 paste0("Dygraph.Export.DownloadByID(",
                        encid, ", ", enc(usetitle), "); return false;"))
    if(asbutton){
      out$attribs$class = paste("btn", class, "download-link")
      out$children = tagList(icon("download"), out$children)
    }
    out
  }

dyDownloadGroup =
  ## Wrapper for a nice list of multiple dyDownload
  ## downIDs can be a named vector, in which case the names are
  ##  used for the labels for dyDownload
  ## If downAll is TRUE, also adds a dyDownload for all plots at the top
  ##  with the label "Download All Plots"
  function(groupid, label, downIDs, downAll = TRUE,
           usetitle = TRUE, asbutton = FALSE){
    if(is.null(names(downIDs))) names(downIDs) = downIDs
    downlist = list()
    for(i in 1:length(downIDs))
      downlist[[i]] = tags$li(
        dyDownload(downIDs[i], names(downIDs)[i],
                   usetitle = usetitle, asbutton = asbutton))
   
    if(downAll)
      downlist = c(list(tags$li(
        dyDownload(downIDs, "Download All Plots",
                   paste0(groupid, "-dyDownloadAll"),
                   usetitle = usetitle, asbutton = asbutton)
        )), downlist)
    
    tags$div(id = groupid, class = "form-group dydownload-group",
      tags$label(label),
      tags$ul(do.call(tagList, downlist))
    )
  }
