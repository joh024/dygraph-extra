library(shiny)
library(dygraphs)
source("dygraph-extra-shiny.R")

shinyServer(function(input, output, session){
  ## Using one of the demos from https://rstudio.github.io/dygraphs/
  ## Only addition is the line adding the callback
  ##  to register the dygraph with dygraph-extra
  hw <- HoltWinters(ldeaths)
  predicted <- predict(hw, n.ahead = 72, prediction.interval = TRUE)

  outdy = dygraph(predicted, main = "Predicted Lung Deaths (UK)") %>%
    dyAxis("x", drawGrid = FALSE) %>%
    dySeries(c("lwr", "fit", "upr"), label = "Deaths") %>%
    dyOptions(colors = RColorBrewer::brewer.pal(3, "Set1")) %>%
    dyCallbacks(drawCallback = dyRegister())
  
  output$dyout = renderDygraph(outdy)
})
