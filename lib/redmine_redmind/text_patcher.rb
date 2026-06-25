module RedmineRedmind
  module TextPatcher
    class InvalidOutlineError < StandardError; end

    module_function

    def block_regexp
      if defined?(ApplicationHelper::MACROS_RE)
        ApplicationHelper::MACROS_RE
      elsif defined?(Redmine::WikiFormatting::Macros::MACROS_RE)
        Redmine::WikiFormatting::Macros::MACROS_RE
      else
        fallback_regexp
      end
    end

    # Mirrors Redmine's MACROS_RE capture layout so group indices match whether
    # we use Redmine's constant or this fallback:
    #   [2] escape "!"  [4] macro name  [5] "(args)"  [7] block body
    def fallback_regexp
      /(
        (!)?
        (
        \{\{
        (\w+)
        (\(([^\n\r]*?)\))?
        ([\n\r].*?[\n\r])?
        \}\}
        )
      )/mx
    end

    def normalize(str)
      str.to_s.gsub(/\r\n?/, "\n").split("\n").map(&:rstrip).join("\n").strip
    end

    def replace_block(source, original_outline, new_outline, occurrence)
      return [source, false] if source.nil?
      raise InvalidOutlineError if new_outline.to_s.include?('}}')

      target = normalize(original_outline)
      wanted = occurrence.to_i
      seen = -1
      found = false

      result = source.gsub(block_regexp) do
        match = Regexp.last_match
        whole = match[0]
        escaped = match[2]
        name = match[4].to_s.downcase

        if escaped || name != 'mindmap'
          whole
        elsif normalize(match[7]) == target
          seen += 1
          if !found && seen == wanted
            found = true
            "{{mindmap#{match[5]}\n#{new_outline}\n}}"
          else
            whole
          end
        else
          whole
        end
      end

      [result, found]
    end
  end
end
