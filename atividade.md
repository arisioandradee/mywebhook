API -> https://api.z-api.io/instances/3EEA3D99189391BBC88ABED0B6A7ED81/token/6B110D271420AD0C3E76AA6E/send-text
ID INSTÂNCIA -> 3EEA3D99189391BBC88ABED0B6A7ED81
TOKEN -> 6B110D271420AD0C3E76AA6E
LINK DOCUMENTACAO API -> https://developer.z-api.io/message/send-message-text


Desenvolva uma aplicação web que receba um arquivo xlsx no estilo do relatorioExemplo.tsx, pegue todos os numeros da coluna whatsapp_socio e "converta" eles pro front-end. cada um deve ter uma opcao de marcar e um botao que habilita ao marcar alguma com "Disparar mensasgem".  

Ao enviar o arquivo, a aplicação deve enviar uma mensagem para cada telefone no arquivo, com o seguinte conteúdo:

Olá, falo com {{nome_socio}}, da empresa nome_empresa?


-- PEGAR CHATS

Conceituação#
Este método é responsável por retornar todos os chats.

Atributos#
Obrigatórios#
Atributos	Tipo	Descrição
page	integer	Utilizado para paginação você de informar aqui a pagina de chats que quer buscar
pageSize	integer	Especifica o tamanho do retorno de chats por pagina
Opcionais#
Atributos	Tipo	Descrição
Request Params#
URL exemplo#
Método

GET https://api.z-api.io/instances/SUA_INSTANCIA/token/SEU_TOKEN/chats

Response#
200#
Atributos	Tipo	Descrição
archived	boolean	true ou false indica se o chat está arquivado
pinned	boolean	true ou false indica se o chat está fixado
phone	string	Phone do contato
unread	string	indica o numero de mensagens não lidas em um chat
name	string	Nome atribudo ao chat, lembrando que se for um grupo ou lista de transmissão deve retorar os respectivos IDs
lastMessageTime	string	Timestamp com a data e hora da última interação com o chat
muteEndTime	string	Timestamp com a data e hora que a notificação vai ser reativada (-1 é para sempre)
isMuted	string	0 ou 1 indica se você silênciou ou não este chat
isMarkedSpam	boolean	true ou false indica se você marcou este chat como spam
profileThumbnail	string	URL da foto do chat o Whatsapp apaga após 48h
isGroupAnnouncement	boolean	true ou false indica se o chat é um grupo de avisos
isGroup	boolean	true ou false indica se o chat é um grupo
notes	object (Note)	Anotações atribuidas ao chat (somente whatsapp business)
messagesUnread	integer	descontinuado
Object (Note)

Atributos	Tipo	Descrição
id	string	Id da anotação
content	string	Texto da anotação
createdAt	number	Timestamp da criação da anotação
lastUpdateAt	number	Timestamp da ultima atualização da anotação
Exemplo

[
  {
    "archived": "false",
    "pinned": "true",
    "messagesUnread": 0,
    "phone": "5511999999999",
    "unread": "0",
    "name": "Z-API SUPORTE",
    "lastMessageTime": "1622991687",
    "isMuted": "0",
    "isMarkedSpam": "false",
    "isGroupAnnouncement": false,
    "isGroup": false,
  },
  {
    "archived": "false",
    "pinned": "true",
    "messagesUnread": 0,
    "phone": "5511999999999",
    "unread": "0",
    "name": "Z-api - Team",
    "lastMessageTime": "1622990503",
    "muteEndTime": 1655953774000,
    "isMuted": "0",
    "isMarkedSpam": "false",
    "isGroupAnnouncement": false,
    "isGroup": false,
    "notes": {
      "id": "KlesU6f4f/Qd5d6VuAbvOMi31rg/F92owVe/xDYad1C=",
      "content": "texto da anotação",
      "createdAt": 1655953774000,
      "lastUpdateAt": 1655953774000
    }
  }
]
405#
Neste caso certifique que esteja enviando o corretamente a especificação do método, ou seja verifique se você enviou o POST ou GET conforme especificado no inicio deste tópico.

415#
Caso você receba um erro 415, certifique de adicionar na headers da requisição o "Content-Type" do objeto que você está enviando, em sua grande maioria "application/json"

Code#
