Gem::Specification.new do |spec|
  spec.name        = 'redmine_redmind'
  spec.version     = File.read(File.expand_path('VERSION', __dir__)).strip
  spec.authors     = ['Redmine Redmind contributors']
  spec.summary     = 'Redmine Redmind'
  spec.description  = 'Author mindmaps as indented lists and view/edit them as interactive diagrams in Redmine wiki pages and issues.'
  spec.homepage    = 'https://github.com/redmine-redmind/redmine_redmind'
  spec.license     = 'MIT'
  spec.required_ruby_version = '>= 2.7.0'

  spec.metadata['redmine_plugin_id'] = 'redmine_redmind'
  spec.metadata['author_url']        = 'https://github.com/redmine-redmind'

  spec.files = Dir[
    'init.rb',
    'VERSION',
    'lib/**/*',
    'app/**/*',
    'assets/**/*',
    'config/**/*',
    'db/**/*',
    'README.md',
    'CHANGELOG.md',
    'LICENSE',
    'LICENSE-THIRD-PARTY'
  ]
  spec.require_paths = ['lib']
end
