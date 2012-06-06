require 'cgi'

open('source.html') do |f|
  data = f.read
  puts <<-eos
    <html>
    <body>
    <script src="http://ajax.googleapis.com/ajax/libs/jquery/1.3.2/jquery.min.js"></script>
    <script src="lib/springy/springy.js"></script>
    <script src="lib/springy/springyui.js"></script>
    <script>
  eos

  puts "var graph = new Graph();\n"
  countries = data.scan(/title="Votes given by: (.*?)"/).each do |match|
    country = CGI.unescapeHTML(match.first)
    id = country.gsub /[^a-z]/i, ''
    puts "var %s = graph.newNode({ label: '%s'});\n" % [id, country]
  end
  data.scan(/title="(\d+)pt from (.*?) goes to (.*?)"/).each do |match|
    points, from, to = match
    points = points.to_f
    from = CGI.unescapeHTML(from).gsub(/[^a-z]/i, '')
    to = CGI.unescapeHTML(to).gsub(/[^a-z]/i, '')
    if points >= 12
      puts "graph.newEdge(%s, %s, {color: 'rgba(0,0,0,%.2f)', weight: %0.2f});\n" % [
        from,
        to,
        (points / 12.0),
        (points / 12.0) * 0.5,
      ]
    end
  end

  puts <<-eos
    jQuery(function(){
      var springy = jQuery('#eurovision').springy({ graph: graph, stiffness: 200, repulsion: 600 });
    });
    </script>

    <canvas id="eurovision" width="1200" height="600" />
    </body>
    </html>
  eos

end
