var ProjectView = Backbone.View.extend({
	initialize: function(options) {
		this.tasks = options.tasks || new TaskList();

		this.tasks.bind('change', _.bind(this.render, this));
		this.tasks.bind('add', _.bind(this.render, this));
		this.tasks.bind('reset', _.bind(this.render, this));

		this.el.empty();
		this.container = $('<div class="container"></div>');
		this.scrollPane = $('<div class="scrollpane"></div>');
		this.scrollPane.append(this.container);
		this.el.append(this.scrollPane);

		var zoom = $('<input class="zoom" type="range" min="10" max="100" step="0.01" value="'+ProjectView.unitWidth()+'" />');
		zoom[0].oninput = function() {
			ProjectView.unitWidth( $(this).val());
		};
		this.el.append(zoom);

		this.el.bind('click', _.bind(function() {
			this.selected = null;
			this.trigger('select');
		}, this));

		this.dragged = false;
		this.el.bind('mousemove', _.bind(this.mousemove, this));
		$(window).bind('mouseup', _.bind(this.mouseup, this));

		ProjectView.events.bind('changed:unitwidth', _.bind(this.render, this));
	},

	mousemove: function(e) {
		if (this.dragged) {
			var endPos = e.clientX;
			var diff = (endPos - this.startPos);
			var length = Math.max(0, this.originalLength + (diff / ProjectView.unitWidth()));
			this.dragged.set({ length: length });
		}
	},

	mouseup: function(e) {
		this.dragged = false;
		this.startPos = false;
		this.originalLength = false;
	},

	render: function() {
		this.container.empty();

		var views = this.tasks.map(_.bind(function(task, i) {
			return new TaskView({ projectView: this, task: task, position: i });
		}, this));

		_(views).each(_.bind(function(view) {

			view.bind('select', _.bind(function(task) {
				console.log(task);
				this.selected = task;
				this.trigger('select', task);
			}, this));

			this.container.append(view.render());

			view.el.find('.drag').bind('mousedown', _.bind(function(e) {
				this.dragged = view.task;
				this.startPos = e.clientX;
				this.originalLength = this.dragged.get('length');
			}, this));
		}, this));

		var height = views.reduce(function(acc, task) {
			return acc + task.height();
		}, 0);

		var width = this.tasks.len() * ProjectView.unitWidth();

		this.container.css({
			'min-height': height + 'px',
			'min-width': width + 'px',
			'background-image': 'url("' + this.background() + '")'
		});
	},

	// Generate grid background image with canvas.. ;-)
	background: function() {
		var canvas = document.createElement('canvas');
		canvas.setAttribute('width', ProjectView.unitWidth());
		canvas.setAttribute('height', 8);
		var context = canvas.getContext("2d");
		context.fillStyle = "rgba(0, 0, 0, 0.1)";
		context.fillRect(ProjectView.unitWidth() - 1,0,1,4);
		return canvas.toDataURL();
	}
});

// Class vars/methods
ProjectView.events = _.extend({}, Backbone.Events);
ProjectView.unitWidth = (function() {
	var value = 40;
	return function(v) {
		if (v) {
			value = v;
			ProjectView.events.trigger('changed:unitwidth');
		}
		return value;
	}
})();

var TaskView = Backbone.View.extend({
	initialize: function(options) {
		this.projectView = options.projectView;
		this.task = options.task;
		this.position = options.position;
		this.el = $(this.template());

		this.el.bind('click', _.bind(this.select, this));
		this.el.bind('touchstart', _.bind(this.select, this));

		// Re-render when selection changes
		this.projectView.bind('select', _.bind(this.render, this));
	},

	select: function(e) {
		e.stopPropagation();
		this.trigger('select', this.task);
	},

	render: function() {
		if (this.projectView.selected === this.task) {
			this.el.addClass('selected');
		} else {
			this.el.removeClass('selected');
		}

		return this.el.css({
			position: 'absolute',
			top: (this.position * this.height()) + 'px',
			left: (this.task.start() * ProjectView.unitWidth()) + 'px',
			width: (this.task.len() * ProjectView.unitWidth()) + 'px',
			height: this.height() + 'px'
		});
	},
	height: function() {
		return 32;
	},
	template: function() {
		return '<div class="task">' +
			'<div class="inner"><span class="label">' + this.task.escape('label') + '</span></div>' +
			'<div class="drag"></div>' +
			'</div>';
	}
});

var EditView = Backbone.View.extend({
	initialize: function(options) {
		this.tasks = options.tasks;

		var self = this;
		options.projectView.bind('select', function(task) {
			self.selected = task;
			self.render();
		});

		options.projectView.bind('deselect', function(task) {
			self.selected = null;
			self.render();
		});

		this.tasks.bind('change', _.bind(this.render, this));
		this.tasks.bind('add', _.bind(this.render, this));
		this.tasks.bind('reset', _.bind(this.render, this));
	},
	render: function() {
		this.el.html($(this.template()));

		if (this.selected) {
			var dependencies = this.selected.get('dependencies').map(function(task) {
				return task.cid;
			});
			this.el.find('[name="label"]').val(this.selected.get('label'));
			this.el.find('[name="start"]').val(this.selected.get('start') || '');
			this.el.find('[name="length"]').val(this.selected.get('length') || '');
			this.el.find('[name="dependencies"]').val(dependencies);
			this.el.find('[type="submit"]')
				.attr('name', 'update')
				.val('Update');
			this.el.find('form').bind('submit', _.bind(this.update, this));

		} else {
			this.el.find('[type="submit"]')
				.attr('name', 'create')
				.val('Create');
			this.el.find('form').bind('submit', _.bind(this.create, this));
		}
	},
	create: function(e) {
		e.preventDefault();
		var dependencies = _(this.el.find('[name="dependencies"]').val()).map(_.bind(function(cid) {
			return this.tasks.getByCid(cid);
		}, this));

		var task = new Task({
			label: this.el.find('[name="label"]').val(),
			start: window.parseFloat(this.el.find('[name="start"]').val(), 10),
			length: window.parseFloat(this.el.find('[name="length"]').val(), 10),
			dependencies: dependencies
		});

		this.tasks.add(task);
	},
	update: function(e) {
		e.preventDefault();

		var dependencies = _(this.el.find('[name="dependencies"] :selected')).map(_.bind(function(option) {
			return this.tasks.getByCid($(option).val());
		}, this));
		this.selected.get('dependencies').reset(dependencies);

		this.selected.set({
			label: this.el.find('[name="label"]').val(),
			start: window.parseFloat(this.el.find('[name="start"]').val(), 10),
			length: window.parseFloat(this.el.find('[name="length"]').val(), 10)
		});
	},

	template: function() {
		return '<form action="" method="post">' +
			'<section>' +
			'<label for="name">Label</label>' +
			'<input id="label" name="label" type="text" />' +
			'</section>' +
			'<section>' +
			'<label for="start">Start</label>' +
			'<input id="start" name="start" type="number" min="0.0" novalidate />' +
			'</section>' +
			'<section>' +
			'<label for="dependencies">Depends on</label>' +
			'<select id="dependencies" name="dependencies" multiple>' +
			_(this.dependencyOptions()).map(function(task) {
				return '<option value="'+task.cid+'">' + task.escape('label') + '</option>';
			}, this).join() +
			'</select>' +
			'</section>' +
			'<section>' +
			'<label for="length">Length</label>' +
			'<input name="length" type="number" min="0.0" novalidate />' +
			'</section>' +
			'<input type="submit" />' +
			'</form>';
	},
	dependencyOptions: function() {
		return this.tasks.without(this.selected);
	}
});
