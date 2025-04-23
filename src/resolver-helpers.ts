
import app from './app';
import { ParsedMarkdownFile, ParsedIndexFile } from './content-file-helpers'

export function getMarkdowFilesForTag(tag : string) {
  return app.get('ALL_CONTENT_FILES').filter((contentFile : ParsedMarkdownFile) => {
    if(contentFile.tags == undefined || contentFile.tags == null) return false 
    return contentFile.tags.includes(tag) 
  })  
}


type TokenisedUrlPath = {
  baseSlug: string;
  subDirs: string[];
}


// on retrospect, 'baseSlug' isn't the best name here - 
// it should be 'nameSlug' and 'subDirs' perhaps
export function tokeniseUrlPath(inputPath: string): TokenisedUrlPath {
  const cleanPath = inputPath.replace(/^\/+/, ''); // remove leading slashes

  const pathIsRoot = inputPath == '/'
  const pathHasTrailingSlash = cleanPath.slice(-1) == '/'
  const pathTokenised = cleanPath.split('/');
  const pathIsTopLevel = pathTokenised.length == 1
  type PathComponents = {parts : Array<string>, baseSlug: string}
  const pathComponents : PathComponents = ((pathTokenised : Array<string>) : PathComponents => {
    let pc : PathComponents = { parts: new Array<string>(), baseSlug: ''}
    // '/' 
    if(pathIsRoot){ 
      // return empty object
    // /tag/tag/
    } else if(pathHasTrailingSlash){
      pc.parts = pathTokenised.filter(token => token !== '') 
      pc.baseSlug = ''
    // /article
    }else if(pathIsTopLevel){
      pc.parts = []
      pc.baseSlug = pathTokenised.pop() || '' 
    // /tag/article
    }else{
      pc.baseSlug = pathTokenised.pop() || ''
      pc.parts = pathTokenised
    }
    return pc
  })(pathTokenised)

  console.log(`tokeniseUrlPath baseSlug: ${pathComponents.baseSlug} subDirs: ${pathComponents.parts.join(',')}`)
  const tokenisedUrlPath : TokenisedUrlPath = {
    baseSlug: pathComponents.baseSlug,
    subDirs: pathComponents.parts
  }
  return tokenisedUrlPath 
}


export async function resolveMarkdownFilePathFromUrlPath(inputPath: string): Promise<string | null> {
  const tokenisedUrlPath = tokeniseUrlPath(inputPath)
  const subDirs = tokenisedUrlPath.subDirs
  const baseSlug = tokenisedUrlPath.baseSlug 
  const allContentFiles = app.get('ALL_CONTENT_FILES')
  const allIndexFiles = app.get('ALL_INDEX_FILES')
  //  Possible paths
  //  /tag/markdown where 'tag' is the name of a subfolder
  //  /tag/markdown where 'tag' is not a folder name  
  //  /tag/tag/markdown where 'tag is the name of subfolder 
  //  /markdown   
  //  /tag/ where 'tag' is a subfolder
  //  /tag/ where 'tag' is not a folder name

  console.log(`resolveMarkdownFilePathFromUrlPath matching subdirs: ${subDirs.join(',')}, baseslug: ${baseSlug}`)

  if(baseSlug == 'home'){ return app.get('CONTENT_DIR') + '/home-index.md'}


  for ( const cf of allContentFiles){
    //console.log('all tags' + cf.tags.join(','))
    console.log('name; ' + cf.filename +'tags:' + cf.tags)

  }
  // /tag
  // /tag/tag/ we would only take the last tag
  if(baseSlug == ''){
    const lastSubDir = subDirs[(subDirs.length - 1)]
    const indexFilesMatchingTag = allIndexFiles.filter((pif : ParsedIndexFile ) => { return pif.tag==lastSubDir })
    if(indexFilesMatchingTag.length > 0) return indexFilesMatchingTag.pop().path
    return ''
  }

  // /article
  if(subDirs.length == 0){
    const contentFilesMatchingFilename = allContentFiles.filter((pmf : ParsedMarkdownFile)=> {
      return pmf.filename.includes(baseSlug)
    })
    if(contentFilesMatchingFilename.length > 0 ) return contentFilesMatchingFilename.at(-1).path
  }

  // /tag/tag/article

  const contentFilesMatchingTagsAndFilename = allContentFiles.filter((pmf : ParsedMarkdownFile)=> {
    console.log(pmf.filename)
    return pmf.filename.includes(baseSlug) && subDirs.every(tag => {
      if (pmf.tags == undefined) return false
      console.log('tags' + pmf.tags)
      console.log('arr' + Array.isArray(pmf.tags))


      console.log(pmf.tags.join(','))
      console.log(pmf.path)
      return pmf.tags.includes(tag)}) 
  })

  if(contentFilesMatchingTagsAndFilename.length > 0 ) return contentFilesMatchingTagsAndFilename.at(-1).path
  return ''
  }

  