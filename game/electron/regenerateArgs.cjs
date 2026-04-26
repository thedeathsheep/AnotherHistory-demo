const REGENERATE_ALL = '__all__'

function buildGenerateChapterArgs(chapterId = REGENERATE_ALL) {
  if (!chapterId || chapterId === REGENERATE_ALL) {
    return ['--all', '--force']
  }
  return [chapterId, '--force']
}

module.exports = {
  REGENERATE_ALL,
  buildGenerateChapterArgs,
}
