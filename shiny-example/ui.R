library(shiny)
library(dygraphs)
source("dygraph-extra-shiny.R")

shinyUI(fluidPage(
  tags$head(
    tags$script(src = "dygraph-extra.js")
  ),
  titlePanel("dygraph-extra shiny-example"),
  div(style = "width: 100%;",
    dyDownload("dyout", "Download Plot", asbutton = TRUE),
    dygraphOutput("dyout", height = 600)
  )
))
