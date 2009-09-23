#!/usr/bin/env narwhal

// Copyright 2009 280 North, Inc. (francisco@280north.com)
// Copyright 2003, 2004, 2005, 2006, 2007, 2008, 2009 by Jim Weirich (jim.weirich@gmail.com)
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.
//

var FILE = require("file"),
    SYSTEM = require("system"),

    Task = require("jake/task").Task,
    FileTask = require("jake/filetask").FileTask,
    FileCreationTask = require("jake/filecreationtask").FileCreationTask,
    TaskManager = require("jake/taskmanager").TaskManager;

var DEFAULT_JAKEFILES = ["jakefile", "Jakefile", "jakefile.js", "Jakefile.js", "jakefile.j", "Jakefile.j"];

var Application = function()
{
    TaskManager.call(this);

    this._name = "rake";
    this._jakefiles = DEFAULT_JAKEFILES.slice();
    this._jakefile = null;
    this._options = { };
//    this._pendingImports = [];
//    this._imported = [];
//    this.loaders = { };
//    this.defaultLoader = Rake::DefaultLoader.new
    this._originalDirectory = FILE.cwd();
    this._topLevelTasks = [];
/*
      add_loader('rb', DefaultLoader.new)
      add_loader('rf', DefaultLoader.new)
      add_loader('rake', DefaultLoader.new)
      @tty_output = STDOUT.tty?*/
}

Application.__proto__ = TaskManager;
Application.prototype.__proto__ = TaskManager.prototype;

// Run the Rake application.  The run method performs the following three steps:
//
// * Initialize the command line options (+init+).
// * Define the tasks (+loadRakefile+).
// * Run the top level tasks (+runTasks+).
//
// If you wish to build a custom rake command, you should call +init+ on your
// application.  The define any tasks.  Finally, call +topLevel+ to run your top
// level tasks.
Application.prototype.run = function()
{
    this.init();
    this.loadRakefile();
    this.topLevel();
}

// Initialize the command line parameters and app name.
Application.prototype.init = function(/*String*/ anApplicationName)
{
    this._name = anApplicationName || "rake";
//    this.handleOptions();
//FIXME: options
    this.collectTasks();
}

// Find the rakefile and then load it and any pending imports.
Application.prototype.loadRakefile = function()
{
    this.rawLoadJakefile();
}

// Run the top level tasks of a Rake application.
Application.prototype.topLevel = function()
{/*
    if (options.showTasks())
        this.displayTasksAndComments();
    
    else if (options.showPrereqs)
        this.displayPreq;
    else
*/
    this._topLevelTasks.forEach(function(/*String*/ aTaskName)
    {
        this.invokeTask(aTaskName);
    }, this);
}

/*
    # Add a loader to handle imported files ending in the extension
    # +ext+.
Application.prototype.

    def add_loader(ext, loader)
      ext = ".#{ext}" unless ext =~ /^\./
      @loaders[ext] = loader
    end

    # Application options from the command line
    def options
      @options ||= OpenStruct.new
    end

    # private ----------------------------------------------------------------
*/

Application.prototype.invokeTask = function(/*String*/ aTaskString)
{
    var result = this.parseTaskString(aTaskString),
        task = this.lookupTask(result[0]);

    task.invoke.apply(task, result[1]);
}

Application.prototype.parseTaskString = function(/*String*/ aString)
{
    var matches = aString.match(/^([^\[]+)(\[(.*)\])$/);

    if (matches)
        return [matches[0], matches[3].split(/\s*,\s*/)];

    return [aString, []];
}
/*
    # Provide standard execption handling for the given block.
    def standard_exception_handling
      begin
        yield
      rescue SystemExit => ex
        # Exit silently with current status
        exit(ex.status)
      rescue SystemExit, OptionParser::InvalidOption => ex
        # Exit silently
        exit(1)
      rescue Exception => ex
        # Exit with error message
        $stderr.puts "#{name} aborted!"
        $stderr.puts ex.message
        if options.trace
          $stderr.puts ex.backtrace.join("\n")
        else
          $stderr.puts ex.backtrace.find {|str| str =~ /#{@rakefile}/ } || ""
          $stderr.puts "(See full trace by running task with --trace)"
        end
        exit(1)
      end
    end
*/

// True if one of the files in RAKEFILES is in the current directory.
// If a match is found, it is copied into @rakefile.
Application.prototype.hasJakefile = function(/*String*/ aDirectory)
{
    var jakefiles = this._jakefiles,
        index = 0,
        count = jakefiles.length;

    for (; index < count; ++index)
    {
        var jakefile = jakefiles[index];

        if (FILE.exists(FILE.join(aDirectory, jakefile)))
            return jakefile;

        else if (jakefile === "")
            return null;
    }
    
    return null;
}
/*
    # True if we are outputting to TTY, false otherwise
    def tty_output?
      @tty_output
    end

    # Override the detected TTY output state (mostly for testing)
    def tty_output=( tty_output_state )
      @tty_output = tty_output_state
    end

    # We will truncate output if we are outputting to a TTY or if we've been
    # given an explicit column width to honor
    def truncate_output?
      tty_output? || ENV['RAKE_COLUMNS']
    end

    # Display the tasks and comments.
    def display_tasks_and_comments
      displayable_tasks = tasks.select { |t|
        t.comment && t.name =~ options.show_task_pattern
      }
      if options.full_description
        displayable_tasks.each do |t|
          puts "#{name} #{t.name_with_args}"
          t.full_comment.split("\n").each do |line|
            puts "    #{line}"
          end
          puts
        end
      else
        width = displayable_tasks.collect { |t| t.name_with_args.length }.max || 10
        max_column = truncate_output? ? terminal_width - name.size - width - 7 : nil
        displayable_tasks.each do |t|
          printf "#{name} %-#{width}s  # %s\n",
            t.name_with_args, max_column ? truncate(t.comment, max_column) : t.comment
        end
      end
    end

    def terminal_width
      if ENV['RAKE_COLUMNS']
        result = ENV['RAKE_COLUMNS'].to_i
      else
        result = unix? ? dynamic_width : 80
      end
      (result < 10) ? 80 : result
    rescue
      80
    end

    # Calculate the dynamic width of the 
    def dynamic_width
      @dynamic_width ||= (dynamic_width_stty.nonzero? || dynamic_width_tput)
    end

    def dynamic_width_stty
      %x{stty size 2>/dev/null}.split[1].to_i
    end

    def dynamic_width_tput
      %x{tput cols 2>/dev/null}.to_i
    end

    def unix?
      RUBY_PLATFORM =~ /(aix|darwin|linux|(net|free|open)bsd|cygwin|solaris|irix|hpux)/i
    end
    
    def windows?
      Win32.windows?
    end

    def truncate(string, width)
      if string.length <= width
        string
      else
        ( string[0, width-3] || "" ) + "..."
      end
    end

    # Display the tasks and prerequisites
    def display_prerequisites
      tasks.each do |t|
        puts "#{name} #{t.name}"
        t.prerequisites.each { |pre| puts "    #{pre}" }
      end
    end

    # A list of all the standard options used in rake, suitable for
    # passing to OptionParser.
    def standard_rake_options
      [
        ['--classic-namespace', '-C', "Put Task and FileTask in the top level namespace",
          lambda { |value|
            require 'rake/classic_namespace'
            options.classic_namespace = true
          }
        ],
        ['--describe', '-D [PATTERN]', "Describe the tasks (matching optional PATTERN), then exit.",
          lambda { |value|
            options.show_tasks = true
            options.full_description = true
            options.show_task_pattern = Regexp.new(value || '')
          }
        ],
        ['--dry-run', '-n', "Do a dry run without executing actions.",
          lambda { |value|
            verbose(true)
            nowrite(true)
            options.dryrun = true
            options.trace = true
          }
        ],
        ['--execute',  '-e CODE', "Execute some Ruby code and exit.",
          lambda { |value|
            eval(value)
            exit
          }
        ],
        ['--execute-print',  '-p CODE', "Execute some Ruby code, print the result, then exit.",
          lambda { |value|
            puts eval(value)
            exit
          }
        ],
        ['--execute-continue',  '-E CODE',
          "Execute some Ruby code, then continue with normal task processing.",
          lambda { |value| eval(value) }            
        ],
        ['--libdir', '-I LIBDIR', "Include LIBDIR in the search path for required modules.",
          lambda { |value| $:.push(value) }
        ],
        ['--prereqs', '-P', "Display the tasks and dependencies, then exit.",
          lambda { |value| options.show_prereqs = true }
        ],
        ['--quiet', '-q', "Do not log messages to standard output.",
          lambda { |value| verbose(false) }
        ],
        ['--rakefile', '-f [FILE]', "Use FILE as the rakefile.",
          lambda { |value| 
            value ||= ''
            @rakefiles.clear 
            @rakefiles << value
          }
        ],
        ['--rakelibdir', '--rakelib', '-R RAKELIBDIR',
          "Auto-import any .rake files in RAKELIBDIR. (default is 'rakelib')",
          lambda { |value| options.rakelib = value.split(':') }
        ],
        ['--require', '-r MODULE', "Require MODULE before executing rakefile.",
          lambda { |value|
            begin
              require value
            rescue LoadError => ex
              begin
                rake_require value
              rescue LoadError => ex2
                raise ex
              end
            end
          }
        ],
        ['--rules', "Trace the rules resolution.",
          lambda { |value| options.trace_rules = true }
        ],
        ['--no-search', '--nosearch', '-N', "Do not search parent directories for the Rakefile.",
          lambda { |value| options.nosearch = true }
        ],
        ['--silent', '-s', "Like --quiet, but also suppresses the 'in directory' announcement.",
          lambda { |value|
            verbose(false)
            options.silent = true
          }
        ],
        ['--system',  '-g',
          "Using system wide (global) rakefiles (usually '~/.rake/*.rake').",
          lambda { |value| options.load_system = true }
        ],
        ['--no-system', '--nosystem', '-G',
          "Use standard project Rakefile search paths, ignore system wide rakefiles.",
          lambda { |value| options.ignore_system = true }
        ],
        ['--tasks', '-T [PATTERN]', "Display the tasks (matching optional PATTERN) with descriptions, then exit.",
          lambda { |value|
            options.show_tasks = true
            options.show_task_pattern = Regexp.new(value || '')
            options.full_description = false
          }
        ],
        ['--trace', '-t', "Turn on invoke/execute tracing, enable full backtrace.",
          lambda { |value|
            options.trace = true
            verbose(true)
          }
        ],
        ['--verbose', '-v', "Log message to standard output.",
          lambda { |value| verbose(true) }
        ],
        ['--version', '-V', "Display the program version.",
          lambda { |value|
            puts "rake, version #{RAKEVERSION}"
            exit
          }
        ]
      ]
    end

    # Read and handle the command line options.
    def handle_options
      options.rakelib = ['rakelib']

      OptionParser.new do |opts|
        opts.banner = "rake [-f rakefile] {options} targets..."
        opts.separator ""
        opts.separator "Options are ..."

        opts.on_tail("-h", "--help", "-H", "Display this help message.") do
          puts opts
          exit
        end

        standard_rake_options.each { |args| opts.on(*args) }
      end.parse!

      # If class namespaces are requested, set the global options
      # according to the values in the options structure.
      if options.classic_namespace
        $show_tasks = options.show_tasks
        $show_prereqs = options.show_prereqs
        $trace = options.trace
        $dryrun = options.dryrun
        $silent = options.silent
      end
    end

    # Similar to the regular Ruby +require+ command, but will check
    # for *.rake files in addition to *.rb files.
    def rake_require(file_name, paths=$LOAD_PATH, loaded=$")
      return false if loaded.include?(file_name)
      paths.each do |path|
        fn = file_name + ".rake"
        full_path = File.join(path, fn)
        if File.exist?(full_path)
          load full_path
          loaded << fn
          return true
        end
      end
      fail LoadError, "Can't find #{file_name}"
    end
*/

Application.prototype.findJakefileLocation = function()
{
    var directory = FILE.cwd(),
        filename = null;

    while (!(filename = this.hasJakefile(directory)))// && !this._options.nosearch)
        directory = FILE.join(directory, "..");

    if (!filename)
        return null;

    return [filename, directory];
}

Application.prototype.rawLoadJakefile = function()
{
    var result = this.findJakefileLocation(),
        jakefile = result ? result[0] : null,
        location = result ? result[1] : null,
        options = this._options;
/*
    if (!options.ignore_system && (options.load_system || !rakefile) && system_dir && FILE.directory?(system_dir)
        if (options["silent"])
            print("(in ");
        puts "(in #{Dir.pwd})" unless options.silent
        glob("#{system_dir}/*.rake") do |name|
          add_import name
        end
    }
    else*/
    {
        if (!jakefile)
            throw "No Jakefile found (looking for: " + this._rakefiles.join(', ') + ")";

        this._jakefile = jakefile;

//        file.chdir(location);

        if (!options["silent"])
            print("(in " + FILE.cwd() + ")");

//        $rakefile = @rakefile if options.classic_namespace

        if (jakefile && jakefile.length)//expand_path?
            require(FILE.absolute(FILE.join(location, jakefile)));

/*        options.rakelib.each do |rlib|
          glob("#{rlib}/*.rake") do |name|
            add_import name
          end
          */
      }
      //load_imports
}

/*
    def glob(path, &block)
      Dir[path.gsub("\\", '/')].each(&block)
    end
    private :glob
*/
/*
    # The directory path containing the system wide rakefiles.
    def system_dir
      @system_dir ||=
        begin
          if ENV['RAKE_SYSTEM']
            ENV['RAKE_SYSTEM']
          elsif Win32.windows?
            Win32.win32_system_dir
          else
            standard_system_dir
          end
        end
    end
    
    # The standard directory containing system wide rake files.
    def standard_system_dir #:nodoc:
      File.join(File.expand_path('~'), '.rake')
    end
    private :standard_system_dir
*/

// Collect the list of tasks on the command line.  If no tasks are
// given, return a list containing only the default task.
// Environmental assignments are processed at this time as well.
Application.prototype.collectTasks = function()
{
    this._topLevelTasks = [];

    var topLevelTasks = this._topLevelTasks;

    SYSTEM.args.slice(1).forEach(function(/*String*/ anArgument)
    {
        var matches = anArgument.match(/^(\w+)=(.*)$/);

        if (matches)
            SYSTEM.env[matches[1]] = matches[2];

        else if (!anArgument.match(/^-/))
            topLevelTasks.push(anArgument);
    });

    if (topLevelTasks.length <= 0)
        topLevelTasks.push("default");
}
/*
    # Add a file to the list of files to be imported.
    def add_import(fn)
      @pending_imports << fn
    end

    # Load the pending list of imported files.
    def load_imports
      while fn = @pending_imports.shift
        next if @imported.member?(fn)
        if fn_task = lookup(fn)
          fn_task.invoke
        end
        ext = File.extname(fn)
        loader = @loaders[ext] || @default_loader
        loader.load(fn)
        @imported << fn
      end
    end

    # Warn about deprecated use of top level constant names.
    def const_warning(const_name)
      @const_warning ||= false
      if ! @const_warning
        $stderr.puts %{WARNING: Deprecated reference to top-level constant '#{const_name}' } +
          %{found at: #{rakefile_location}} # '
        $stderr.puts %{    Use --classic-namespace on rake command}
        $stderr.puts %{    or 'require "rake/classic_namespace"' in Rakefile}
      end
      @const_warning = true
    end

    def rakefile_location
      begin
        fail
      rescue RuntimeError => ex
        ex.backtrace.find {|str| str =~ /#{@rakefile}/ } || ""
      end
    end
  */

// Exports
exports.Task = Task;
exports.FileTask = FileTask;
exports.FileCreationTask = FileCreationTask;
exports.TaskManager = TaskManager;
exports.Application = Application;

var application = null;

exports.application = function()
{
    if (!application)
        application = new Application();

    return application;
}

exports.setApplication = function(/*Application*/ anApplication)
{
    application = anApplication;
}

exports.EARLY = new Date(-10000,1,1,0,0,0,0).getTime();

exports.task = function()
{
    return Task.defineTask.apply(Task, arguments);
}

exports.file = function()
{
    return FileTask.defineTask.apply(FileTask, arguments);
}

exports.fileCreate = function()
{
    return FileCreationTask.defineTask.apply(FileCreationTask, arguments);
}

exports.directory = function(aDirectory)
{
    var oldLength = null;

    while (aDirectory !== "." && aDirectory.length !== oldLength)
    {
        exports.fileCreate(aDirectory, function(aTask)
        {
            var taskName = aTask.name();

            if (!FILE.exists(taskName))
                FILE.mkdirs(taskName);
        });

        oldLength = aDirectory.length;
        aDirectory = FILE.dirname(aDirectory);
    }
}

exports.filedir = function()
{
    var fileTask = FileTask.defineTask.apply(FileTask, arguments),
        fileDirectory = FILE.dirname(fileTask.name());

    exports.directory (fileDirectory);
    exports.file (fileTask.name(), fileDirectory);
}
/*
    # Return the original directory where the Rake application was started.
    def original_dir
      application.original_dir
    end
*/